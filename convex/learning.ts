import { getAuthUserId } from '@convex-dev/auth/server';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import { action, internalMutation, mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getLessonCourse } from './content';
import { submittedAnswerValidator } from './learningValidators';
import { gradeQuestion } from '../src/features/questions/question-engine';
import type { Question, QuestionAnswer } from '../src/features/questions/questions.types';
import { applyLessonQuestProgress, mergeQuestProgress } from '../src/features/lessons/reward-progress';
import {
  effectiveStreakDays,
  isValidTimezone,
  localDateKey,
  localTimeAt,
  addDateKeyDays,
  currentStreakLength,
  longestStreakLength,
  nextStreakReminderAt,
} from './streakReminderTime';

const HEARTS_DEFAULT = 5;
const GEMS_PER_LESSON = 12;
const QUEST_POINTS_PER_LESSON = 1;
const MONTHLY_QUEST_TARGET = 30;
const createGuestSessionInternalRef = makeFunctionReference<
  'mutation',
  { learnerId: string; credentialHash: string },
  Id<'learnerSessions'>
>('learning:createGuestSessionInternal');
const sendLessonCompletedNotificationRef = makeFunctionReference<
  'action',
  { userId: Id<'users'>; attemptId: Id<'lessonAttempts'> },
  null
>('notifications:sendLessonCompleted');

type Owner =
  | { ownerType: 'user'; userId: Id<'users'>; learnerSessionId?: undefined }
  | { ownerType: 'learner'; learnerSessionId: Id<'learnerSessions'>; userId?: undefined };

function credentialHash(credential: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(credential)));
}

function ownerMatches(owner: Owner, document: {
  ownerType: 'user' | 'learner';
  userId?: Id<'users'>;
  learnerSessionId?: Id<'learnerSessions'>;
}) {
  return owner.ownerType === document.ownerType
    && (owner.ownerType === 'user'
      ? owner.userId === document.userId
      : owner.learnerSessionId === document.learnerSessionId);
}

async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Owner & { ownerType: 'user' }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('UNAUTHENTICATED');
  return { ownerType: 'user', userId };
}

async function requireGuest(
  ctx: QueryCtx | MutationCtx,
  learnerId: string,
  credential: string,
): Promise<Owner & { ownerType: 'learner' }> {
  const learner = await ctx.db
    .query('learnerSessions')
    .withIndex('by_learner_id', (q) => q.eq('learnerId', learnerId))
    .unique();
  if (!learner || learner.credentialHash !== credentialHash(credential)) {
    throw new ConvexError({ code: 'INVALID_LEARNER_CREDENTIAL' });
  }
  if (!learner.anonymous || learner.userId) throw new ConvexError({ code: 'LEARNER_ALREADY_MERGED' });
  return { ownerType: 'learner', learnerSessionId: learner._id };
}

async function getProgress(
  ctx: QueryCtx | MutationCtx,
  owner: Owner,
  courseId: Id<'courses'>,
) {
  return owner.ownerType === 'user'
    ? await ctx.db
      .query('userCourseProgress')
      .withIndex('by_user_course', (q) => q.eq('userId', owner.userId).eq('courseId', courseId))
      .unique()
    : await ctx.db
      .query('userCourseProgress')
      .withIndex('by_learner_course', (q) => q.eq('learnerSessionId', owner.learnerSessionId).eq('courseId', courseId))
      .unique();
}

async function ensureProgress(
  ctx: MutationCtx,
  owner: Owner,
  hierarchy: NonNullable<Awaited<ReturnType<typeof getLessonCourse>>>,
) {
  const current = await getProgress(ctx, owner, hierarchy.course._id);
  if (current) return current;
  const timestamp = Date.now();
  const id = await ctx.db.insert('userCourseProgress', {
    ...owner,
    courseId: hierarchy.course._id,
    currentUnitId: hierarchy.unit._id,
    currentLessonId: hierarchy.lesson._id,
    status: 'not_started',
    totalXp: 0,
    hearts: HEARTS_DEFAULT,
    completedLessonKeys: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const progress = await ctx.db.get(id);
  if (!progress) throw new Error('Unable to create course progress');
  return progress;
}

async function orderedCourseLessons(ctx: QueryCtx | MutationCtx, courseId: Id<'courses'>) {
  const units = await ctx.db
    .query('units')
    .withIndex('by_course_order', (q) => q.eq('courseId', courseId))
    .collect();
  const groups = await Promise.all(units.filter((unit) => unit.status === 'published').map((unit) => ctx.db
    .query('lessons')
    .withIndex('by_unit_status_order', (q) => q.eq('unitId', unit._id).eq('status', 'published'))
    .collect()));
  return groups.flat();
}

async function startAttempt(
  ctx: MutationCtx,
  owner: Owner,
  lessonKey: string,
  clientAttemptKey: string,
) {
  const existing = await ctx.db
    .query('lessonAttempts')
    .withIndex('by_client_key', (q) => q.eq('clientAttemptKey', clientAttemptKey))
    .unique();
  if (existing) {
    if (!ownerMatches(owner, existing)) throw new Error('FORBIDDEN');
    return { attemptId: existing._id, hearts: HEARTS_DEFAULT, resumed: true };
  }

  const lesson = await ctx.db.query('lessons').withIndex('by_key', (q) => q.eq('key', lessonKey)).unique();
  if (!lesson || lesson.status !== 'published') throw new Error('LESSON_NOT_PUBLISHED');
  const hierarchy = await getLessonCourse(ctx, lesson._id);
  if (!hierarchy || hierarchy.course.status !== 'published') throw new Error('LESSON_NOT_PUBLISHED');
  const progress = await ensureProgress(ctx, owner, hierarchy);
  const lessons = await orderedCourseLessons(ctx, hierarchy.course._id);
  const lessonIndex = lessons.findIndex((item) => item._id === lesson._id);
  if (lessonIndex > 0 && !progress.completedLessonKeys.includes(lessons[lessonIndex - 1].key)) {
    throw new Error('LESSON_LOCKED');
  }

  const exercises = await ctx.db
    .query('exercises')
    .withIndex('by_lesson_status_order', (q) => q.eq('lessonId', lesson._id).eq('status', 'published'))
    .collect();
  const attemptId = await ctx.db.insert('lessonAttempts', {
    ...owner,
    lessonId: lesson._id,
    clientAttemptKey,
    status: 'active',
    correctCount: 0,
    incorrectCount: 0,
    score: 0,
    maximumScore: 0,
    xpEarned: 0,
    totalExercises: exercises.length,
    startedAt: Date.now(),
  });
  await ctx.db.patch(progress._id, { status: 'in_progress', currentLessonId: lesson._id, updatedAt: Date.now() });
  if (owner.ownerType === 'user') await ctx.db.patch(owner.userId, { lastActiveAt: Date.now() });
  else await ctx.db.patch(owner.learnerSessionId, { lastSeenAt: Date.now() });
  return { attemptId, hearts: progress.hearts, resumed: false };
}

async function submitExercise(
  ctx: MutationCtx,
  owner: Owner,
  args: {
    attemptId: Id<'lessonAttempts'>;
    exerciseKey: string;
    answer: QuestionAnswer;
    idempotencyKey: string;
    responseTimeMs: number;
  },
) {
  const duplicate = await ctx.db
    .query('exerciseAttempts')
    .withIndex('by_idempotency', (q) => q.eq('idempotencyKey', args.idempotencyKey))
    .unique();
  if (duplicate) {
    const attempt = await ctx.db.get(duplicate.lessonAttemptId);
    if (!attempt || !ownerMatches(owner, attempt)) throw new Error('FORBIDDEN');
    return {
      status: duplicate.status,
      score: duplicate.score,
      maximumScore: duplicate.maximumScore,
      heartsRemaining: (await progressForAttempt(ctx, owner, attempt)).hearts,
      duplicate: true,
    };
  }

  const attempt = await ctx.db.get(args.attemptId);
  if (!attempt || !ownerMatches(owner, attempt)) throw new Error('FORBIDDEN');
  if (attempt.status !== 'active') throw new Error('ATTEMPT_NOT_ACTIVE');
  const exercise = await ctx.db.query('exercises').withIndex('by_key', (q) => q.eq('key', args.exerciseKey)).unique();
  if (!exercise || exercise.lessonId !== attempt.lessonId || exercise.status !== 'published') {
    throw new Error('EXERCISE_NOT_IN_ATTEMPT');
  }
  if (exercise.type !== args.answer.type) throw new Error('ANSWER_TYPE_MISMATCH');
  const solution = await ctx.db
    .query('exerciseSolutions')
    .withIndex('by_exercise', (q) => q.eq('exerciseId', exercise._id))
    .unique();
  if (!solution) throw new Error('SOLUTION_NOT_FOUND');

  const question = JSON.parse(solution.solutionDataJson) as Question;
  const result = gradeQuestion(question, args.answer);
  const timestamp = Date.now();
  const practiceDateKey = await dateKeyForOwner(ctx, owner, timestamp);
  await ctx.db.insert('exerciseAttempts', {
    lessonAttemptId: attempt._id,
    ...(owner.ownerType === 'user' ? { userId: owner.userId } : { learnerSessionId: owner.learnerSessionId }),
    exerciseId: exercise._id,
    submittedAnswer: args.answer,
    status: result.status,
    score: result.score,
    maximumScore: result.maximumScore,
    responseTimeMs: Math.max(0, args.responseTimeMs),
    idempotencyKey: args.idempotencyKey,
    answeredAt: timestamp,
  });

  const progress = await progressForAttempt(ctx, owner, attempt);
  const deductHeart = result.status === 'incorrect';
  const heartsRemaining = deductHeart ? Math.max(0, progress.hearts - 1) : progress.hearts;
  await ctx.db.patch(progress._id, {
    hearts: heartsRemaining,
    updatedAt: timestamp,
    lastPracticeDate: practiceDateKey,
  });
  await ctx.db.patch(attempt._id, {
    correctCount: attempt.correctCount + (result.status === 'correct' ? 1 : 0),
    incorrectCount: attempt.incorrectCount + (deductHeart ? 1 : 0),
    score: attempt.score + result.score,
    maximumScore: attempt.maximumScore + result.maximumScore,
  });

  return { ...result, heartsRemaining, duplicate: false };
}

async function progressForAttempt(ctx: QueryCtx | MutationCtx, owner: Owner, attempt: Doc<'lessonAttempts'>) {
  const hierarchy = await getLessonCourse(ctx, attempt.lessonId);
  if (!hierarchy) throw new Error('COURSE_NOT_FOUND');
  const progress = await getProgress(ctx, owner, hierarchy.course._id);
  if (!progress) throw new Error('PROGRESS_NOT_FOUND');
  return progress;
}

function dateDifference(left: string, right: string) {
  return Math.round((Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86_400_000);
}

async function timezoneForOwner(ctx: QueryCtx | MutationCtx, owner: Owner) {
  if (owner.ownerType !== 'user') return 'UTC';
  const user = await ctx.db.get(owner.userId);
  return user?.timezone && isValidTimezone(user.timezone) ? user.timezone : 'UTC';
}

async function dateKeyForOwner(
  ctx: QueryCtx | MutationCtx,
  owner: Owner,
  timestamp: number,
) {
  return localDateKey(timestamp, await timezoneForOwner(ctx, owner));
}

function monthKeyForDate(dateKey: string) {
  return dateKey.slice(0, 7);
}

function dateKeyOffset(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekBounds(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const start = dateKeyOffset(dateKey, -mondayOffset);
  return { start, end: dateKeyOffset(start, 6) };
}

async function getRewardWallet(ctx: QueryCtx | MutationCtx, owner: Owner) {
  return owner.ownerType === 'user'
    ? await ctx.db.query('learnerRewards').withIndex('by_user', (q) => q.eq('userId', owner.userId)).unique()
    : await ctx.db.query('learnerRewards').withIndex('by_learner', (q) => q.eq('learnerSessionId', owner.learnerSessionId)).unique();
}

async function ensureRewardWallet(ctx: MutationCtx, owner: Owner) {
  const existing = await getRewardWallet(ctx, owner);
  if (existing) return existing;
  const timestamp = Date.now();
  const id = await ctx.db.insert('learnerRewards', {
    ...owner,
    gems: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const wallet = await ctx.db.get(id);
  if (!wallet) throw new Error('REWARD_WALLET_NOT_FOUND');
  return wallet;
}

async function getMonthlyQuest(ctx: QueryCtx | MutationCtx, owner: Owner, monthKey: string) {
  return owner.ownerType === 'user'
    ? await ctx.db.query('monthlyQuestProgress').withIndex('by_user_month', (q) => q.eq('userId', owner.userId).eq('monthKey', monthKey)).unique()
    : await ctx.db.query('monthlyQuestProgress').withIndex('by_learner_month', (q) => q.eq('learnerSessionId', owner.learnerSessionId).eq('monthKey', monthKey)).unique();
}

async function ensureMonthlyQuest(ctx: MutationCtx, owner: Owner, monthKey: string) {
  const existing = await getMonthlyQuest(ctx, owner, monthKey);
  if (existing) return existing;
  const timestamp = Date.now();
  const id = await ctx.db.insert('monthlyQuestProgress', {
    ...owner,
    monthKey,
    questPoints: 0,
    lessonsCompleted: 0,
    highAccuracyLessons: 0,
    streakExtensions: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const progress = await ctx.db.get(id);
  if (!progress) throw new Error('MONTHLY_QUEST_NOT_FOUND');
  return progress;
}

function monthlyQuestView(progress: Doc<'monthlyQuestProgress'> | null, monthKey: string) {
  return {
    monthKey,
    questPoints: progress?.questPoints ?? 0,
    questTarget: MONTHLY_QUEST_TARGET,
    lessonsCompleted: progress?.lessonsCompleted ?? 0,
    lessonsTarget: 2,
    highAccuracyLessons: progress?.highAccuracyLessons ?? 0,
    highAccuracyTarget: 3,
    streakExtensions: progress?.streakExtensions ?? 0,
    streakTarget: 1,
  };
}

async function activityDatesForWeek(ctx: QueryCtx | MutationCtx, owner: Owner, dateKey: string) {
  const { start, end } = weekBounds(dateKey);
  const activities = owner.ownerType === 'user'
    ? await ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', owner.userId).gte('dateKey', start).lte('dateKey', end)).collect()
    : await ctx.db.query('dailyActivity').withIndex('by_learner_date', (q) => q.eq('learnerSessionId', owner.learnerSessionId).gte('dateKey', start).lte('dateKey', end)).collect();
  return activities.filter((activity) => activity.lessonsCompleted > 0).map((activity) => activity.dateKey).sort();
}

async function activityDatesForMonth(ctx: QueryCtx, owner: Owner, monthKey: string) {
  const firstDay = new Date(`${monthKey}-01T00:00:00Z`);
  const lastDay = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0));
  const start = firstDay.toISOString().slice(0, 10);
  const end = lastDay.toISOString().slice(0, 10);
  const activities = owner.ownerType === 'user'
    ? await ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', owner.userId).gte('dateKey', start).lte('dateKey', end)).collect()
    : await ctx.db.query('dailyActivity').withIndex('by_learner_date', (q) => q.eq('learnerSessionId', owner.learnerSessionId).gte('dateKey', start).lte('dateKey', end)).collect();
  return activities.filter((activity) => activity.lessonsCompleted > 0).map((activity) => activity.dateKey).sort();
}

async function guestStreak(ctx: QueryCtx | MutationCtx, learnerSessionId: Id<'learnerSessions'>, dateKey: string) {
  const activities = await ctx.db.query('dailyActivity').withIndex('by_learner_date', (q) => q.eq('learnerSessionId', learnerSessionId)).collect();
  const dates = new Set(activities.filter((activity) => activity.lessonsCompleted > 0).map((activity) => activity.dateKey));
  let cursor = dates.has(dateKey) ? dateKey : dateKeyOffset(dateKey, -1);
  if (!dates.has(cursor)) return 0;
  let days = 0;
  while (dates.has(cursor)) {
    days += 1;
    cursor = dateKeyOffset(cursor, -1);
  }
  return days;
}

async function updateStreak(ctx: MutationCtx, userId: Id<'users'>, dateKey: string) {
  const streak = await ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', userId)).unique();
  if (!streak) {
    await ctx.db.insert('streaks', { userId, currentDays: 1, longestDays: 1, lastQualifiedDate: dateKey, updatedAt: Date.now() });
    return 1;
  }
  const difference = streak.lastQualifiedDate ? dateDifference(dateKey, streak.lastQualifiedDate) : 1;
  const currentDays = difference === 0 ? streak.currentDays : difference === 1 ? streak.currentDays + 1 : 1;
  await ctx.db.patch(streak._id, {
    currentDays,
    longestDays: Math.max(streak.longestDays, currentDays),
    lastQualifiedDate: dateKey,
    updatedAt: Date.now(),
  });
  return currentDays;
}

async function awardLessonCompletion(
  ctx: MutationCtx,
  owner: Owner,
  lessonAttemptId: Id<'lessonAttempts'>,
  dateKey: string,
  accuracyPercent: number,
  firstLessonToday: boolean,
) {
  const existing = await ctx.db.query('lessonRewards').withIndex('by_attempt', (q) => q.eq('lessonAttemptId', lessonAttemptId)).unique();
  if (existing) return existing;

  await ensureRewardWallet(ctx, owner);
  const monthKey = monthKeyForDate(dateKey);
  const monthly = await ensureMonthlyQuest(ctx, owner, monthKey);
  const nextMonthly = applyLessonQuestProgress(monthly, {
    questPoints: QUEST_POINTS_PER_LESSON,
    accuracyPercent,
    firstLessonToday,
  });
  await ctx.db.patch(monthly._id, {
    ...nextMonthly,
    updatedAt: Date.now(),
  });
  const timestamp = Date.now();
  const rewardId = await ctx.db.insert('lessonRewards', {
    lessonAttemptId,
    ...owner,
    monthKey,
    questPoints: QUEST_POINTS_PER_LESSON,
    gems: GEMS_PER_LESSON,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const reward = await ctx.db.get(rewardId);
  if (!reward) throw new Error('LESSON_REWARD_NOT_FOUND');
  return reward;
}

async function completionSummary(
  ctx: QueryCtx | MutationCtx,
  owner: Owner,
  attempt: Doc<'lessonAttempts'>,
  hierarchy: NonNullable<Awaited<ReturnType<typeof getLessonCourse>>>,
  progress: Doc<'userCourseProgress'>,
) {
  const completedAt = attempt.completedAt ?? Date.now();
  const dateKey = await dateKeyForOwner(ctx, owner, completedAt);
  const monthKey = monthKeyForDate(dateKey);
  const [wallet, monthly, reward, weeklyActivityDateKeys, streak, currentLesson] = await Promise.all([
    getRewardWallet(ctx, owner),
    getMonthlyQuest(ctx, owner, monthKey),
    ctx.db.query('lessonRewards').withIndex('by_attempt', (q) => q.eq('lessonAttemptId', attempt._id)).unique(),
    activityDatesForWeek(ctx, owner, dateKey),
    owner.ownerType === 'user'
      ? ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', owner.userId)).unique()
      : guestStreak(ctx, owner.learnerSessionId, dateKey),
    progress.currentLessonId ? ctx.db.get(progress.currentLessonId) : Promise.resolve(null),
  ]);
  const streakDays = typeof streak === 'number' ? streak : streak?.currentDays ?? 0;

  return {
    attemptId: attempt._id,
    lessonId: hierarchy.lesson.key,
    score: attempt.score,
    maximumScore: attempt.maximumScore,
    earnedXp: attempt.xpEarned,
    maximumXp: hierarchy.lesson.xpReward,
    accuracyPercent: attempt.maximumScore ? Math.round(attempt.score / attempt.maximumScore * 100) : 0,
    durationSeconds: Math.max(0, Math.floor((completedAt - attempt.startedAt) / 1000)),
    completedAt,
    heartsRemaining: progress.hearts,
    totalXp: progress.totalXp,
    streakDays,
    completedLessons: progress.completedLessonKeys.length,
    nextLessonKey: currentLesson?.key ?? null,
    weeklyActivityDateKeys,
    monthlyQuest: monthlyQuestView(monthly, monthKey),
    reward: {
      questPointsEarned: reward?.questPoints ?? 0,
      gemsAvailable: reward?.gems ?? 0,
      claimed: Boolean(reward?.chestClaimedAt),
      totalGems: wallet?.gems ?? 0,
    },
  };
}

async function completeAttempt(ctx: MutationCtx, owner: Owner, attemptId: Id<'lessonAttempts'>) {
  const attempt = await ctx.db.get(attemptId);
  if (!attempt || !ownerMatches(owner, attempt)) throw new Error('FORBIDDEN');
  const hierarchy = await getLessonCourse(ctx, attempt.lessonId);
  if (!hierarchy) throw new Error('LESSON_NOT_FOUND');
  const progress = await ensureProgress(ctx, owner, hierarchy);
  if (attempt.status === 'completed') {
    return completionSummary(ctx, owner, attempt, hierarchy, progress);
  }
  if (attempt.status !== 'active') throw new Error('ATTEMPT_NOT_ACTIVE');

  const exercises = await ctx.db
    .query('exercises')
    .withIndex('by_lesson_status_order', (q) => q.eq('lessonId', attempt.lessonId).eq('status', 'published'))
    .collect();
  const answers = await ctx.db
    .query('exerciseAttempts')
    .withIndex('by_attempt', (q) => q.eq('lessonAttemptId', attempt._id))
    .collect();
  const bestAnswers = exercises.map((exercise) => answers
    .filter((answer) => answer.exerciseId === exercise._id)
    .sort((left, right) => (right.score / Math.max(1, right.maximumScore)) - (left.score / Math.max(1, left.maximumScore)))[0]);
  if (bestAnswers.some((answer) => !answer || answer.status !== 'correct')) throw new Error('LESSON_INCOMPLETE');

  const maximumScore = bestAnswers.reduce((total, answer) => total + (answer?.maximumScore ?? 0), 0);
  const score = bestAnswers.reduce((total, answer) => total + (answer?.score ?? 0), 0);
  const xpEarned = exercises.reduce((total, exercise, index) => {
    const answer = bestAnswers[index];
    return total + Math.round(exercise.xp * ((answer?.score ?? 0) / Math.max(1, answer?.maximumScore ?? 1)));
  }, 0);
  const timestamp = Date.now();
  const dateKey = await dateKeyForOwner(ctx, owner, timestamp);
  const completedLessonKeys = [...new Set([...progress.completedLessonKeys, hierarchy.lesson.key])];
  const lessons = await orderedCourseLessons(ctx, hierarchy.course._id);
  const nextLesson = lessons.find((lesson) => !completedLessonKeys.includes(lesson.key));
  const nextHierarchy = nextLesson ? await getLessonCourse(ctx, nextLesson._id) : null;

  await ctx.db.patch(attempt._id, {
    status: 'completed',
    score,
    maximumScore,
    xpEarned,
    completedAt: timestamp,
  });
  await ctx.db.patch(progress._id, {
    totalXp: progress.totalXp + xpEarned,
    completedLessonKeys,
    status: nextLesson ? 'in_progress' : 'completed',
    currentLessonId: nextLesson?._id,
    currentUnitId: nextHierarchy?.unit._id ?? hierarchy.unit._id,
    lastPracticeDate: dateKey,
    updatedAt: timestamp,
  });

  const firstLessonToday = await applyDailyActivity(ctx, owner, dateKey, xpEarned);
  if (owner.ownerType === 'user') await updateStreak(ctx, owner.userId, dateKey);
  const accuracyPercent = maximumScore ? Math.round(score / maximumScore * 100) : 0;
  await awardLessonCompletion(ctx, owner, attempt._id, dateKey, accuracyPercent, firstLessonToday);
  if (owner.ownerType === 'user') {
    const user = await ctx.db.get(owner.userId);
    const nextStreakEmailAt = user?.timezone
      && isValidTimezone(user.timezone)
      && user.onboarding?.reminderPreference === 'enabled'
      && user.email?.trim()
      ? localTimeAt(addDateKeyDays(localDateKey(timestamp, user.timezone), 1), 19, user.timezone)
      : undefined;
    await ctx.db.patch(owner.userId, {
      lastActiveAt: timestamp,
      lastPracticeAt: timestamp,
      nextStreakEmailAt,
    });
  }
  else await ctx.db.patch(owner.learnerSessionId, { lastSeenAt: timestamp });

  if (owner.ownerType === 'user') {
    await ctx.scheduler.runAfter(0, sendLessonCompletedNotificationRef, {
      userId: owner.userId,
      attemptId: attempt._id,
    });
  }

  const [completedAttempt, updatedProgress] = await Promise.all([
    ctx.db.get(attempt._id),
    ctx.db.get(progress._id),
  ]);
  if (!completedAttempt || !updatedProgress) throw new Error('COMPLETION_STATE_NOT_FOUND');
  return completionSummary(ctx, owner, completedAttempt, hierarchy, updatedProgress);
}

async function applyDailyActivity(ctx: MutationCtx, owner: Owner, dateKey: string, xpEarned: number) {
  const existing = owner.ownerType === 'user'
    ? await ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', owner.userId).eq('dateKey', dateKey)).unique()
    : await ctx.db.query('dailyActivity').withIndex('by_learner_date', (q) => q.eq('learnerSessionId', owner.learnerSessionId).eq('dateKey', dateKey)).unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      lessonsCompleted: existing.lessonsCompleted + 1,
      xpEarned: existing.xpEarned + xpEarned,
      updatedAt: Date.now(),
    });
    return false;
  } else {
    await ctx.db.insert('dailyActivity', {
      ...(owner.ownerType === 'user' ? { userId: owner.userId } : { learnerSessionId: owner.learnerSessionId }),
      dateKey,
      lessonsCompleted: 1,
      xpEarned,
      updatedAt: Date.now(),
    });
    return true;
  }
}

async function claimLessonReward(ctx: MutationCtx, owner: Owner, attemptId: Id<'lessonAttempts'>) {
  const reward = await ctx.db.query('lessonRewards').withIndex('by_attempt', (q) => q.eq('lessonAttemptId', attemptId)).unique();
  if (!reward || !ownerMatches(owner, reward)) throw new Error('REWARD_NOT_FOUND');
  const attempt = await ctx.db.get(attemptId);
  if (!attempt || !ownerMatches(owner, attempt) || attempt.status !== 'completed') throw new Error('FORBIDDEN');
  const wallet = await ensureRewardWallet(ctx, owner);
  if (reward.chestClaimedAt) {
    return { gemsEarned: reward.gems, totalGems: wallet.gems, alreadyClaimed: true };
  }
  const timestamp = Date.now();
  const totalGems = wallet.gems + reward.gems;
  await ctx.db.patch(wallet._id, { gems: totalGems, updatedAt: timestamp });
  await ctx.db.patch(reward._id, { chestClaimedAt: timestamp, updatedAt: timestamp });
  return { gemsEarned: reward.gems, totalGems, alreadyClaimed: false };
}

async function progressView(ctx: QueryCtx, progress: Doc<'userCourseProgress'>) {
  const course = await ctx.db.get(progress.courseId);
  const currentLesson = progress.currentLessonId ? await ctx.db.get(progress.currentLessonId) : null;
  return {
    id: progress._id,
    courseId: progress.courseId,
    courseKey: course?.key ?? null,
    currentLessonKey: currentLesson?.key ?? null,
    status: progress.status,
    totalXp: progress.totalXp,
    hearts: progress.hearts,
    completedLessons: progress.completedLessonKeys.length,
    lastPracticeDate: progress.lastPracticeDate ?? null,
  };
}

export const createGuestSessionInternal = internalMutation({
  args: { learnerId: v.string(), credentialHash: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('learnerSessions').withIndex('by_learner_id', (q) => q.eq('learnerId', args.learnerId)).unique();
    if (existing) return existing._id;
    const timestamp = Date.now();
    return await ctx.db.insert('learnerSessions', {
      ...args,
      anonymous: true,
      createdAt: timestamp,
      lastSeenAt: timestamp,
    });
  },
});

export const createGuestSession = action({
  args: {},
  handler: async (ctx): Promise<{ learnerId: string; credential: string }> => {
    const learnerId = `guest_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const credential = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
    await ctx.runMutation(createGuestSessionInternalRef, {
      learnerId,
      credentialHash: credentialHash(credential),
    });
    return { learnerId, credential };
  },
});

export const validateGuestSession = query({
  args: { learnerId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const learner = await ctx.db
      .query('learnerSessions')
      .withIndex('by_learner_id', (q) => q.eq('learnerId', args.learnerId))
      .unique();
    return {
      valid: Boolean(
        learner
        && learner.credentialHash === credentialHash(args.credential)
        && learner.anonymous
        && !learner.userId,
      ),
    };
  },
});

export const startAuthenticatedAttempt = mutation({
  args: { lessonKey: v.string(), clientAttemptKey: v.string() },
  handler: async (ctx, args) => startAttempt(ctx, await requireUser(ctx), args.lessonKey, args.clientAttemptKey),
});

export const startGuestAttempt = mutation({
  args: { learnerId: v.string(), credential: v.string(), lessonKey: v.string(), clientAttemptKey: v.string() },
  handler: async (ctx, args) => startAttempt(ctx, await requireGuest(ctx, args.learnerId, args.credential), args.lessonKey, args.clientAttemptKey),
});

const submitArgs = {
  attemptId: v.id('lessonAttempts'),
  exerciseKey: v.string(),
  answer: submittedAnswerValidator,
  idempotencyKey: v.string(),
  responseTimeMs: v.number(),
};

export const submitAuthenticatedExercise = mutation({
  args: submitArgs,
  handler: async (ctx, args) => submitExercise(ctx, await requireUser(ctx), args as typeof args & { answer: QuestionAnswer }),
});

export const submitGuestExercise = mutation({
  args: { learnerId: v.string(), credential: v.string(), ...submitArgs },
  handler: async (ctx, args) => submitExercise(ctx, await requireGuest(ctx, args.learnerId, args.credential), args as typeof args & { answer: QuestionAnswer }),
});

export const completeAuthenticatedAttempt = mutation({
  args: { attemptId: v.id('lessonAttempts') },
  handler: async (ctx, args) => completeAttempt(ctx, await requireUser(ctx), args.attemptId),
});

export const completeGuestAttempt = mutation({
  args: { learnerId: v.string(), credential: v.string(), attemptId: v.id('lessonAttempts') },
  handler: async (ctx, args) => completeAttempt(ctx, await requireGuest(ctx, args.learnerId, args.credential), args.attemptId),
});

export const claimAuthenticatedLessonReward = mutation({
  args: { attemptId: v.id('lessonAttempts') },
  handler: async (ctx, args) => claimLessonReward(ctx, await requireUser(ctx), args.attemptId),
});

export const claimGuestLessonReward = mutation({
  args: { learnerId: v.string(), credential: v.string(), attemptId: v.id('lessonAttempts') },
  handler: async (ctx, args) => claimLessonReward(ctx, await requireGuest(ctx, args.learnerId, args.credential), args.attemptId),
});

export const getAuthenticatedProgress = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireUser(ctx);
    const progress = await ctx.db.query('userCourseProgress').withIndex('by_user_course', (q) => q.eq('userId', owner.userId)).collect();
    const user = await ctx.db.get(owner.userId);
    const timezone = user?.timezone && isValidTimezone(user.timezone) ? user.timezone : 'UTC';
    const currentDateKey = localDateKey(Date.now(), timezone);
    const monthKey = monthKeyForDate(currentDateKey);
    const [streak, wallet, monthlyQuest, monthlyActivityDateKeys] = await Promise.all([
      ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', owner.userId)).unique(),
      getRewardWallet(ctx, owner),
      getMonthlyQuest(ctx, owner, monthKey),
      activityDatesForMonth(ctx, owner, monthKey),
    ]);
    return {
      progress: await Promise.all(progress.map((item) => progressView(ctx, item))),
      streakDays: effectiveStreakDays(
        streak?.currentDays ?? 0,
        user?.lastPracticeAt,
        timezone,
      ),
      gems: wallet?.gems ?? 0,
      monthlyQuest: monthlyQuestView(monthlyQuest, monthKey),
      monthlyActivityDateKeys,
    };
  },
});

export const getGuestProgress = query({
  args: { learnerId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const learner = await ctx.db
      .query('learnerSessions')
      .withIndex('by_learner_id', (q) => q.eq('learnerId', args.learnerId))
      .unique();
    if (!learner || learner.credentialHash !== credentialHash(args.credential) || !learner.anonymous || learner.userId) {
      return null;
    }
    const owner: Owner = { ownerType: 'learner', learnerSessionId: learner._id };
    const progress = await ctx.db.query('userCourseProgress').withIndex('by_learner_course', (q) => q.eq('learnerSessionId', owner.learnerSessionId)).collect();
    const monthKey = monthKeyForDate(new Date().toISOString().slice(0, 10));
    const [streakDays, wallet, monthlyQuest, monthlyActivityDateKeys] = await Promise.all([
      guestStreak(ctx, owner.learnerSessionId, new Date().toISOString().slice(0, 10)),
      getRewardWallet(ctx, owner),
      getMonthlyQuest(ctx, owner, monthKey),
      activityDatesForMonth(ctx, owner, monthKey),
    ]);
    return {
      progress: await Promise.all(progress.map((item) => progressView(ctx, item))),
      streakDays,
      gems: wallet?.gems ?? 0,
      monthlyQuest: monthlyQuestView(monthlyQuest, monthKey),
      monthlyActivityDateKeys,
    };
  },
});

export const mergeGuestProgress = mutation({
  args: { learnerId: v.string(), credential: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const account = await ctx.db.get(user.userId);
    const learner = await ctx.db.query('learnerSessions').withIndex('by_learner_id', (q) => q.eq('learnerId', args.learnerId)).unique();
    if (!learner || learner.credentialHash !== credentialHash(args.credential)) {
      throw new ConvexError({ code: 'INVALID_LEARNER_CREDENTIAL' });
    }
    if (learner.userId) {
      if (learner.userId !== user.userId) throw new Error('LEARNER_ALREADY_CLAIMED');
      return { merged: false, alreadyMerged: true };
    }

    const guestProgress = await ctx.db.query('userCourseProgress').withIndex('by_learner_course', (q) => q.eq('learnerSessionId', learner._id)).collect();
    for (const guest of guestProgress) {
      const existing = await ctx.db.query('userCourseProgress').withIndex('by_user_course', (q) => q.eq('userId', user.userId).eq('courseId', guest.courseId)).unique();
      if (existing) {
        const completedLessonKeys = [...new Set([...existing.completedLessonKeys, ...guest.completedLessonKeys])];
        await ctx.db.patch(existing._id, {
          totalXp: Math.max(existing.totalXp, guest.totalXp),
          hearts: Math.max(existing.hearts, guest.hearts),
          completedLessonKeys,
          currentUnitId: guest.completedLessonKeys.length > existing.completedLessonKeys.length ? guest.currentUnitId : existing.currentUnitId,
          currentLessonId: guest.completedLessonKeys.length > existing.completedLessonKeys.length ? guest.currentLessonId : existing.currentLessonId,
          status: completedLessonKeys.length > existing.completedLessonKeys.length ? guest.status : existing.status,
          lastPracticeDate: [existing.lastPracticeDate, guest.lastPracticeDate].filter(Boolean).sort().at(-1),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(guest._id);
      } else {
        await ctx.db.patch(guest._id, { ownerType: 'user', userId: user.userId, learnerSessionId: undefined, updatedAt: Date.now() });
      }
    }

    const attempts = await ctx.db.query('lessonAttempts').withIndex('by_learner_lesson', (q) => q.eq('learnerSessionId', learner._id)).collect();
    for (const attempt of attempts) await ctx.db.patch(attempt._id, { ownerType: 'user', userId: user.userId, learnerSessionId: undefined });
    const exerciseAttempts = await ctx.db.query('exerciseAttempts').collect();
    for (const attempt of exerciseAttempts.filter((item) => item.learnerSessionId === learner._id)) {
      await ctx.db.patch(attempt._id, { userId: user.userId, learnerSessionId: undefined });
    }
    const activities = await ctx.db.query('dailyActivity').withIndex('by_learner_date', (q) => q.eq('learnerSessionId', learner._id)).collect();
    const timezone = account?.timezone && isValidTimezone(account.timezone) ? account.timezone : 'UTC';
    const normalizedActivity = new Map<string, { lessonsCompleted: number; xpEarned: number }>();
    const completedGuestAttempts = attempts.filter((attempt) =>
      attempt.status === 'completed' && attempt.completedAt !== undefined);
    if (completedGuestAttempts.length > 0) {
      for (const attempt of completedGuestAttempts) {
        const dateKey = localDateKey(attempt.completedAt!, timezone);
        const current = normalizedActivity.get(dateKey) ?? { lessonsCompleted: 0, xpEarned: 0 };
        normalizedActivity.set(dateKey, {
          lessonsCompleted: current.lessonsCompleted + 1,
          xpEarned: current.xpEarned + attempt.xpEarned,
        });
      }
    } else {
      for (const activity of activities) {
        normalizedActivity.set(activity.dateKey, {
          lessonsCompleted: activity.lessonsCompleted,
          xpEarned: activity.xpEarned,
        });
      }
    }
    for (const activity of activities) await ctx.db.delete(activity._id);
    for (const [dateKey, activity] of normalizedActivity) {
      const existing = await ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', user.userId).eq('dateKey', dateKey)).unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          lessonsCompleted: existing.lessonsCompleted + activity.lessonsCompleted,
          xpEarned: existing.xpEarned + activity.xpEarned,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert('dailyActivity', {
          userId: user.userId,
          dateKey,
          lessonsCompleted: activity.lessonsCompleted,
          xpEarned: activity.xpEarned,
          updatedAt: Date.now(),
        });
      }
    }
    const allActivities = await ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', user.userId)).collect();
    const dates = allActivities.filter((activity) => activity.lessonsCompleted > 0).map((activity) => activity.dateKey).sort();
    const today = localDateKey(Date.now(), timezone);
    const currentDays = currentStreakLength(dates, today);
    const longestDays = longestStreakLength(dates);
    const streak = await ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', user.userId)).unique();
    if (streak) {
      await ctx.db.patch(streak._id, {
        currentDays,
        longestDays: Math.max(streak.longestDays, longestDays),
        lastQualifiedDate: dates.at(-1),
        updatedAt: Date.now(),
      });
    } else if (dates.length > 0) {
      await ctx.db.insert('streaks', {
        userId: user.userId,
        currentDays,
        longestDays,
        lastQualifiedDate: dates.at(-1),
        updatedAt: Date.now(),
      });
    }

    const guestWallet = await ctx.db.query('learnerRewards').withIndex('by_learner', (q) => q.eq('learnerSessionId', learner._id)).unique();
    if (guestWallet) {
      const userWallet = await ctx.db.query('learnerRewards').withIndex('by_user', (q) => q.eq('userId', user.userId)).unique();
      if (userWallet) {
        await ctx.db.patch(userWallet._id, { gems: userWallet.gems + guestWallet.gems, updatedAt: Date.now() });
        await ctx.db.delete(guestWallet._id);
      } else {
        await ctx.db.patch(guestWallet._id, { ownerType: 'user', userId: user.userId, learnerSessionId: undefined, updatedAt: Date.now() });
      }
    }

    const guestMonths = await ctx.db.query('monthlyQuestProgress').withIndex('by_learner_month', (q) => q.eq('learnerSessionId', learner._id)).collect();
    for (const guestMonth of guestMonths) {
      const userMonth = await ctx.db.query('monthlyQuestProgress').withIndex('by_user_month', (q) => q.eq('userId', user.userId).eq('monthKey', guestMonth.monthKey)).unique();
      if (userMonth) {
        const mergedMonth = mergeQuestProgress(userMonth, guestMonth);
        await ctx.db.patch(userMonth._id, {
          ...mergedMonth,
          updatedAt: Date.now(),
        });
        await ctx.db.delete(guestMonth._id);
      } else {
        await ctx.db.patch(guestMonth._id, { ownerType: 'user', userId: user.userId, learnerSessionId: undefined, updatedAt: Date.now() });
      }
    }

    const guestRewards = await ctx.db.query('lessonRewards').withIndex('by_learner_month', (q) => q.eq('learnerSessionId', learner._id)).collect();
    for (const reward of guestRewards) {
      await ctx.db.patch(reward._id, { ownerType: 'user', userId: user.userId, learnerSessionId: undefined, updatedAt: Date.now() });
    }

    await ctx.db.patch(learner._id, { userId: user.userId, anonymous: false, mergedAt: Date.now(), lastSeenAt: Date.now() });
    const guestLastPracticeAt = completedGuestAttempts.reduce<number | undefined>(
      (latest, attempt) => latest === undefined
        ? attempt.completedAt
        : Math.max(latest, attempt.completedAt!),
      undefined,
    );
    const lastPracticeAt = guestLastPracticeAt === undefined
      ? account?.lastPracticeAt
      : Math.max(account?.lastPracticeAt ?? 0, guestLastPracticeAt);
    let nextStreakEmailAt: number | undefined;
    if (
      account?.onboarding?.reminderPreference === 'enabled'
      && account.email?.trim()
      && lastPracticeAt !== undefined
      && currentDays > 0
    ) {
      nextStreakEmailAt = nextStreakReminderAt(lastPracticeAt, timezone);
    }
    await ctx.db.patch(user.userId, {
      lastActiveAt: Date.now(),
      lastPracticeAt,
      nextStreakEmailAt,
    });
    return { merged: true, alreadyMerged: false };
  },
});

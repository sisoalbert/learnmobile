import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import { userOnboardingValidator } from './onboarding';
import {
  attemptStatusValidator,
  contentStatusValidator,
  exerciseTypeValidator,
  progressStatusValidator,
  submittedAnswerValidator,
} from './learningValidators';
import { userRoleValidator } from './roles';

export default defineSchema({
  ...authTables,
  authVerifiers: authTables.authVerifiers.index('sessionId', ['sessionId']),
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    age: v.optional(v.number()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    normalizedUsername: v.optional(v.string()),
    role: v.optional(userRoleValidator),
    plan: v.optional(v.union(v.literal('free'), v.literal('premium'))),
    createdAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
    lastPracticeAt: v.optional(v.number()),
    lastStreakEmailAt: v.optional(v.number()),
    nextStreakEmailAt: v.optional(v.number()),
    lastStreakPushAt: v.optional(v.number()),
    nextStreakPushAt: v.optional(v.number()),
    streakEmailVariantIndex: v.optional(v.number()),
    deletionPendingAt: v.optional(v.number()),
    onboarding: v.optional(userOnboardingValidator),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('normalizedUsername', ['normalizedUsername'])
    .index('by_nextStreakEmailAt', ['nextStreakEmailAt'])
    .index('by_nextStreakPushAt', ['nextStreakPushAt']),
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
  featureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
  courses: defineTable({
    key: v.string(),
    title: v.string(),
    description: v.string(),
    kind: v.literal('technology'),
    contentLanguage: v.string(),
    subject: v.string(),
    iconUrl: v.optional(v.string()),
    order: v.number(),
    status: contentStatusValidator,
    contentVersion: v.number(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_status_order', ['status', 'order']),
  units: defineTable({
    key: v.string(),
    courseId: v.id('courses'),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    status: contentStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_course_order', ['courseId', 'order']),
  lessons: defineTable({
    key: v.string(),
    unitId: v.id('units'),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    xpReward: v.number(),
    minimumPassingScore: v.number(),
    status: contentStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_unit_order', ['unitId', 'order'])
    .index('by_unit_status_order', ['unitId', 'status', 'order']),
  exercises: defineTable({
    key: v.string(),
    lessonId: v.id('lessons'),
    type: exerciseTypeValidator,
    title: v.string(),
    prompt: v.string(),
    instruction: v.optional(v.string()),
    publicDataJson: v.string(),
    explanationJson: v.optional(v.string()),
    xp: v.number(),
    order: v.number(),
    version: v.number(),
    status: contentStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_lesson_order', ['lessonId', 'order'])
    .index('by_lesson_status_order', ['lessonId', 'status', 'order']),
  exerciseOptions: defineTable({
    exerciseId: v.id('exercises'),
    group: v.string(),
    key: v.string(),
    content: v.string(),
    metadataJson: v.optional(v.string()),
    order: v.number(),
  }).index('by_exercise_group_order', ['exerciseId', 'group', 'order']),
  exerciseSolutions: defineTable({
    exerciseId: v.id('exercises'),
    solutionDataJson: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_exercise', ['exerciseId']),
  learnerSessions: defineTable({
    learnerId: v.string(),
    credentialHash: v.string(),
    userId: v.optional(v.id('users')),
    anonymous: v.boolean(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
    mergedAt: v.optional(v.number()),
  })
    .index('by_learner_id', ['learnerId'])
    .index('by_user', ['userId']),
  userCourseProgress: defineTable({
    ownerType: v.union(v.literal('user'), v.literal('learner')),
    userId: v.optional(v.id('users')),
    learnerSessionId: v.optional(v.id('learnerSessions')),
    courseId: v.id('courses'),
    currentUnitId: v.optional(v.id('units')),
    currentLessonId: v.optional(v.id('lessons')),
    status: progressStatusValidator,
    totalXp: v.number(),
    hearts: v.number(),
    completedLessonKeys: v.array(v.string()),
    lastPracticeDate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_course', ['userId', 'courseId'])
    .index('by_learner_course', ['learnerSessionId', 'courseId']),
  lessonAttempts: defineTable({
    ownerType: v.union(v.literal('user'), v.literal('learner')),
    userId: v.optional(v.id('users')),
    learnerSessionId: v.optional(v.id('learnerSessions')),
    lessonId: v.id('lessons'),
    clientAttemptKey: v.string(),
    status: attemptStatusValidator,
    correctCount: v.number(),
    incorrectCount: v.number(),
    score: v.number(),
    maximumScore: v.number(),
    xpEarned: v.number(),
    totalExercises: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_client_key', ['clientAttemptKey'])
    .index('by_user_lesson', ['userId', 'lessonId'])
    .index('by_user_status_completed_at', ['userId', 'status', 'completedAt'])
    .index('by_learner_lesson', ['learnerSessionId', 'lessonId']),
  exerciseAttempts: defineTable({
    lessonAttemptId: v.id('lessonAttempts'),
    userId: v.optional(v.id('users')),
    learnerSessionId: v.optional(v.id('learnerSessions')),
    exerciseId: v.id('exercises'),
    submittedAnswer: submittedAnswerValidator,
    status: v.union(
      v.literal('correct'),
      v.literal('incorrect'),
      v.literal('partially_correct'),
      v.literal('error'),
    ),
    score: v.number(),
    maximumScore: v.number(),
    responseTimeMs: v.number(),
    idempotencyKey: v.string(),
    answeredAt: v.number(),
  })
    .index('by_attempt', ['lessonAttemptId'])
    .index('by_idempotency', ['idempotencyKey'])
    .index('by_user_exercise', ['userId', 'exerciseId']),
  dailyActivity: defineTable({
    userId: v.optional(v.id('users')),
    learnerSessionId: v.optional(v.id('learnerSessions')),
    dateKey: v.string(),
    lessonsCompleted: v.number(),
    xpEarned: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_date', ['userId', 'dateKey'])
    .index('by_learner_date', ['learnerSessionId', 'dateKey']),
  streaks: defineTable({
    userId: v.id('users'),
    currentDays: v.number(),
    longestDays: v.number(),
    lastQualifiedDate: v.optional(v.string()),
    frozenDaysUsed: v.optional(v.number()),
    freezeStartedDate: v.optional(v.string()),
    lastFreezeReminderDate: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
  learnerRewards: defineTable({
    ownerType: v.union(v.literal('user'), v.literal('learner')),
    userId: v.optional(v.id('users')),
    learnerSessionId: v.optional(v.id('learnerSessions')),
    gems: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_learner', ['learnerSessionId']),
  monthlyQuestProgress: defineTable({
    ownerType: v.union(v.literal('user'), v.literal('learner')),
    userId: v.optional(v.id('users')),
    learnerSessionId: v.optional(v.id('learnerSessions')),
    monthKey: v.string(),
    questPoints: v.number(),
    lessonsCompleted: v.number(),
    highAccuracyLessons: v.number(),
    streakExtensions: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_month', ['userId', 'monthKey'])
    .index('by_learner_month', ['learnerSessionId', 'monthKey']),
  lessonRewards: defineTable({
    lessonAttemptId: v.id('lessonAttempts'),
    ownerType: v.union(v.literal('user'), v.literal('learner')),
    userId: v.optional(v.id('users')),
    learnerSessionId: v.optional(v.id('learnerSessions')),
    monthKey: v.string(),
    questPoints: v.number(),
    gems: v.number(),
    chestClaimedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_attempt', ['lessonAttemptId'])
    .index('by_user_month', ['userId', 'monthKey'])
    .index('by_learner_month', ['learnerSessionId', 'monthKey']),
  achievements: defineTable({
    key: v.string(),
    title: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    threshold: v.number(),
    status: contentStatusValidator,
    order: v.number(),
  }).index('by_key', ['key']),
  userAchievements: defineTable({
    userId: v.id('users'),
    achievementId: v.id('achievements'),
    progress: v.number(),
    unlockedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_achievement', ['userId', 'achievementId']),
  subscriptions: defineTable({
    userId: v.id('users'),
    provider: v.string(),
    externalSubscriptionId: v.optional(v.string()),
    productId: v.string(),
    status: v.union(
      v.literal('inactive'),
      v.literal('trialing'),
      v.literal('active'),
      v.literal('past_due'),
      v.literal('canceled'),
    ),
    periodEndsAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_provider', ['userId', 'provider']),
  revenueCatWebhookEvents: defineTable({
    appUserId: v.string(),
    eventId: v.string(),
    receivedAt: v.number(),
  }).index('by_event_id', ['eventId']),
  leaderboards: defineTable({
    key: v.string(),
    courseId: v.optional(v.id('courses')),
    period: v.union(v.literal('daily'), v.literal('weekly'), v.literal('all_time')),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    status: v.union(v.literal('scheduled'), v.literal('active'), v.literal('closed')),
  }).index('by_key', ['key']),
  leaderboardEntries: defineTable({
    leaderboardId: v.id('leaderboards'),
    userId: v.id('users'),
    xp: v.number(),
    rank: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_leaderboard_xp', ['leaderboardId', 'xp'])
    .index('by_leaderboard_user', ['leaderboardId', 'userId'])
    .index('by_user', ['userId']),
  devices: defineTable({
    userId: v.id('users'),
    installationId: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
    expoPushToken: v.optional(v.string()),
    pushEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSeenAt: v.optional(v.number()),
    disabledAt: v.optional(v.number()),
    removedAt: v.optional(v.number()),
  })
    .index('by_installation', ['installationId'])
    .index('by_push_token', ['expoPushToken'])
    .index('by_user', ['userId'])
    .index('by_user_push_enabled', ['userId', 'pushEnabled']),
  pushNotificationDeliveries: defineTable({
    userId: v.id('users'),
    lessonAttemptId: v.optional(v.id('lessonAttempts')),
    type: v.optional(v.union(v.literal('lesson_completed'), v.literal('streak_reminder'))),
    reminderDate: v.optional(v.string()),
    deviceId: v.id('devices'),
    ticketId: v.optional(v.string()),
    status: v.union(
      v.literal('ticketed'),
      v.literal('provider_accepted'),
      v.literal('failed'),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_attempt', ['lessonAttemptId'])
    .index('by_ticket', ['ticketId']),
  deletedUsers: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    role: v.optional(userRoleValidator),
    plan: v.optional(v.union(v.literal("free"), v.literal("premium"))),
    createdAt: v.optional(v.number()),
    deletedAt: v.number(),
    deletedByUserId: v.optional(v.union(v.id('users'), v.string())),
    deletedByEmail: v.optional(v.string()),
    deletionReason: v.optional(v.string()),
    snapshotJson: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"])
    .index("by_deleted_at", ["deletedAt"]),
  accountDeletionRequests: defineTable({
    email: v.optional(v.string()),
    emailHash: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('pending_confirmation'),
      v.literal('verified'),
      v.literal('processed'),
      v.literal('rejected'),
    ),
    confirmationTokenHash: v.optional(v.string()),
    confirmationExpiresAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_email_status', ['email', 'status'])
    .index('by_confirmation_token', ['confirmationTokenHash']),
  accountDeletionRateLimits: defineTable({
    identifierHash: v.string(),
    windowStartedAt: v.number(),
    requestCount: v.number(),
    updatedAt: v.number(),
  }).index('by_identifier', ['identifierHash']),
  userDeletionJobs: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    role: v.optional(userRoleValidator),
    plan: v.optional(v.union(v.literal('free'), v.literal('premium'))),
    accountCreatedAt: v.optional(v.number()),
    deletedByUserId: v.string(),
    deletionReason: v.string(),
    stage: v.union(
      v.literal('authSessions'),
      v.literal('authAccounts'),
      v.literal('pushNotificationDeliveries'),
      v.literal('exerciseAttempts'),
      v.literal('lessonRewards'),
      v.literal('lessonAttempts'),
      v.literal('userCourseProgress'),
      v.literal('dailyActivity'),
      v.literal('streaks'),
      v.literal('learnerRewards'),
      v.literal('monthlyQuestProgress'),
      v.literal('userAchievements'),
      v.literal('subscriptions'),
      v.literal('leaderboardEntries'),
      v.literal('devices'),
      v.literal('learnerSessions'),
      v.literal('deletionRequests'),
      v.literal('finalize'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user_id', ['userId']),
});

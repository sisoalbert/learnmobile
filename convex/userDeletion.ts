import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { internalMutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';

const BATCH_SIZE = 100;

const deletionStageValidator = v.union(
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
);

type DeletionStage =
  | 'authSessions'
  | 'authAccounts'
  | 'pushNotificationDeliveries'
  | 'exerciseAttempts'
  | 'lessonRewards'
  | 'lessonAttempts'
  | 'userCourseProgress'
  | 'dailyActivity'
  | 'streaks'
  | 'learnerRewards'
  | 'monthlyQuestProgress'
  | 'userAchievements'
  | 'subscriptions'
  | 'leaderboardEntries'
  | 'devices'
  | 'learnerSessions'
  | 'deletionRequests'
  | 'finalize';

const STAGES: DeletionStage[] = [
  'authSessions',
  'authAccounts',
  'pushNotificationDeliveries',
  'exerciseAttempts',
  'lessonRewards',
  'lessonAttempts',
  'userCourseProgress',
  'dailyActivity',
  'streaks',
  'learnerRewards',
  'monthlyQuestProgress',
  'userAchievements',
  'subscriptions',
  'leaderboardEntries',
  'devices',
  'learnerSessions',
  'deletionRequests',
  'finalize',
];

const runUserDeletionBatchRef = makeFunctionReference<
  'mutation',
  { jobId: Id<'userDeletionJobs'> },
  null
>('userDeletion:runUserDeletionBatch');

function nextStage(stage: DeletionStage): DeletionStage {
  return STAGES[Math.min(STAGES.indexOf(stage) + 1, STAGES.length - 1)];
}

function normalizedEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

async function scheduleNext(ctx: MutationCtx, jobId: Id<'userDeletionJobs'>) {
  await ctx.scheduler.runAfter(0, runUserDeletionBatchRef, { jobId });
}

async function deleteDocuments(
  ctx: MutationCtx,
  documents: Array<{ _id: Id<any> }>,
) {
  for (const document of documents) {
    await ctx.db.delete(document._id);
  }
}

export async function startUserDeletion(
  ctx: MutationCtx,
  user: Doc<'users'>,
  options: { deletedByUserId: Id<'users'>; reason: string },
) {
  const userId = String(user._id);
  const existingJob = await ctx.db
    .query('userDeletionJobs')
    .withIndex('by_user_id', (q) => q.eq('userId', userId))
    .first();

  if (existingJob) return existingJob._id;

  const now = Date.now();
  const jobId = await ctx.db.insert('userDeletionJobs', {
    userId,
    email: normalizedEmail(user.email),
    role: user.role,
    plan: user.plan,
    accountCreatedAt: user.createdAt ?? user._creationTime,
    deletedByUserId: String(options.deletedByUserId),
    deletionReason: options.reason.slice(0, 500),
    stage: 'authSessions',
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(user._id, { deletionPendingAt: now });
  await scheduleNext(ctx, jobId);
  return jobId;
}

export const runUserDeletionBatch = internalMutation({
  args: { jobId: v.id('userDeletionJobs') },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return null;

    const userId = ctx.db.normalizeId('users', job.userId);
    if (!userId) {
      await ctx.db.delete(jobId);
      return null;
    }

    let deletedCount = 0;

    switch (job.stage) {
      case 'authSessions': {
        const session = await ctx.db
          .query('authSessions')
          .withIndex('userId', (q) => q.eq('userId', userId))
          .first();
        if (session) {
          const refreshTokens = await ctx.db
            .query('authRefreshTokens')
            .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
            .take(BATCH_SIZE);
          const verifiers = await ctx.db
            .query('authVerifiers')
            .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
            .take(BATCH_SIZE);
          await deleteDocuments(ctx, [...refreshTokens, ...verifiers]);
          deletedCount = refreshTokens.length + verifiers.length;
          if (deletedCount === 0) {
            await ctx.db.delete(session._id);
            deletedCount = 1;
          }
        }
        break;
      }
      case 'authAccounts': {
        const account = await ctx.db
          .query('authAccounts')
          .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
          .first();
        if (account) {
          const codes = await ctx.db
            .query('authVerificationCodes')
            .withIndex('accountId', (q) => q.eq('accountId', account._id))
            .take(BATCH_SIZE);
          const accountRateLimits = await ctx.db
            .query('authRateLimits')
            .withIndex('identifier', (q) => q.eq('identifier', account._id))
            .take(BATCH_SIZE);
          const identifierRateLimits = await ctx.db
            .query('authRateLimits')
            .withIndex('identifier', (q) => q.eq('identifier', account.providerAccountId))
            .take(BATCH_SIZE);
          await deleteDocuments(ctx, [...codes, ...accountRateLimits, ...identifierRateLimits]);
          deletedCount = codes.length + accountRateLimits.length + identifierRateLimits.length;
          if (deletedCount === 0) {
            await ctx.db.delete(account._id);
            deletedCount = 1;
          }
        }
        break;
      }
      case 'pushNotificationDeliveries': {
        const documents = await ctx.db.query('pushNotificationDeliveries').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'exerciseAttempts': {
        const documents = await ctx.db.query('exerciseAttempts').withIndex('by_user_exercise', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'lessonRewards': {
        const documents = await ctx.db.query('lessonRewards').withIndex('by_user_month', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'lessonAttempts': {
        const documents = await ctx.db.query('lessonAttempts').withIndex('by_user_lesson', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'userCourseProgress': {
        const documents = await ctx.db.query('userCourseProgress').withIndex('by_user_course', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'dailyActivity': {
        const documents = await ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'streaks': {
        const documents = await ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'learnerRewards': {
        const documents = await ctx.db.query('learnerRewards').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'monthlyQuestProgress': {
        const documents = await ctx.db.query('monthlyQuestProgress').withIndex('by_user_month', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'userAchievements': {
        const documents = await ctx.db.query('userAchievements').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'subscriptions': {
        const documents = await ctx.db.query('subscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'leaderboardEntries': {
        const documents = await ctx.db.query('leaderboardEntries').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'devices': {
        const documents = await ctx.db.query('devices').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'learnerSessions': {
        const documents = await ctx.db.query('learnerSessions').withIndex('by_user', (q) => q.eq('userId', userId)).take(BATCH_SIZE);
        await deleteDocuments(ctx, documents);
        deletedCount = documents.length;
        break;
      }
      case 'deletionRequests': {
        if (job.email) {
          const requests = await ctx.db
            .query('accountDeletionRequests')
            .withIndex('by_email_status', (q) => q.eq('email', job.email).eq('status', 'verified'))
            .take(BATCH_SIZE);
          for (const request of requests) {
            await ctx.db.patch(request._id, {
              email: undefined,
              status: 'processed',
              processedAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
          deletedCount = requests.length;
        }
        break;
      }
      case 'finalize': {
        await ctx.db.insert('deletedUsers', {
          userId: job.userId,
          role: job.role,
          plan: job.plan,
          createdAt: job.accountCreatedAt,
          deletedAt: Date.now(),
          deletedByUserId: job.deletedByUserId,
          deletionReason: job.deletionReason,
        });
        const user = await ctx.db.get(userId);
        if (user) await ctx.db.delete(userId);
        await ctx.db.delete(jobId);
        return null;
      }
    }

    if (deletedCount === 0) {
      await ctx.db.patch(jobId, { stage: nextStage(job.stage), updatedAt: Date.now() });
    } else {
      await ctx.db.patch(jobId, { updatedAt: Date.now() });
    }
    await scheduleNext(ctx, jobId);
    return null;
  },
});

export { deletionStageValidator };

import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

import { query } from './_generated/server';

const tableName = v.union(
  v.literal('users'),
  v.literal('tasks'),
  v.literal('featureFlags'),
  v.literal('courses'),
  v.literal('units'),
  v.literal('lessons'),
  v.literal('exercises'),
  v.literal('exerciseOptions'),
  v.literal('exerciseSolutions'),
  v.literal('learnerSessions'),
  v.literal('userCourseProgress'),
  v.literal('lessonAttempts'),
  v.literal('exerciseAttempts'),
  v.literal('dailyActivity'),
  v.literal('streaks'),
  v.literal('learnerRewards'),
  v.literal('monthlyQuestProgress'),
  v.literal('lessonRewards'),
  v.literal('achievements'),
  v.literal('userAchievements'),
  v.literal('subscriptions'),
  v.literal('leaderboards'),
  v.literal('leaderboardEntries'),
  v.literal('devices'),
  v.literal('pushNotificationDeliveries'),
);

export const listTableRows = query({
  args: {
    table: tableName,
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 100), 250));
    return await ctx.db.query(args.table).order('desc').take(limit);
  },
});

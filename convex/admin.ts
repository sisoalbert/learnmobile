import { v } from 'convex/values';

import { internalMutation, query } from './_generated/server';
import { requireAdmin } from './authz';
import { userRoleValidator } from './roles';

export const setUserRole = internalMutation({
  args: {
    userId: v.id('users'),
    role: userRoleValidator,
  },
  returns: v.object({
    userId: v.id('users'),
    role: userRoleValidator,
  }),
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(userId, { role });
    return { userId, role };
  },
});

export const listUsers = query({
  args: {},
  returns: v.array(v.object({
    id: v.id('users'),
    name: v.string(),
    email: v.string(),
    plan: v.union(v.literal('free'), v.literal('premium')),
    platform: v.union(v.literal('iOS'), v.literal('Android'), v.literal('Web')),
    courseProgress: v.number(),
    streak: v.number(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    isActive: v.boolean(),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query('users').order('desc').take(250);
    const totalLessons = (await ctx.db.query('lessons').collect()).length;
    const activeThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);

    return await Promise.all(users.map(async (user) => {
      const [devices, progressRecords, streak] = await Promise.all([
        ctx.db.query('devices').withIndex('by_user', (q) => q.eq('userId', user._id)).collect(),
        ctx.db.query('userCourseProgress').withIndex('by_user_course', (q) => q.eq('userId', user._id)).collect(),
        ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', user._id)).first(),
      ]);
      const latestDevice = devices.reduce<(typeof devices)[number] | undefined>(
        (latest, device) => !latest || device.updatedAt > latest.updatedAt ? device : latest,
        undefined,
      );
      const completedLessons = new Set(progressRecords.flatMap((progress) => progress.completedLessonKeys)).size;
      const createdAt = user.createdAt ?? user._creationTime;
      const lastActiveAt = Math.max(
        user.lastActiveAt ?? createdAt,
        latestDevice?.lastSeenAt ?? 0,
      );
      const name = user.name?.trim()
        || [user.firstName, user.lastName].filter(Boolean).join(' ')
        || user.username
        || 'Unnamed user';

      return {
        id: user._id,
        name,
        email: user.email ?? 'No email',
        plan: user.plan ?? 'free',
        platform: latestDevice?.platform === 'ios'
          ? 'iOS' as const
          : latestDevice?.platform === 'android'
            ? 'Android' as const
            : 'Web' as const,
        courseProgress: totalLessons > 0
          ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
          : 0,
        streak: streak?.currentDays ?? 0,
        createdAt,
        lastActiveAt,
        isActive: lastActiveAt >= activeThreshold,
      };
    }));
  },
});

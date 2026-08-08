import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      return null;
    }

    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect();
    const provider = accounts[0]?.provider;

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      age: user.age,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      plan: user.plan ?? 'free',
      createdAt: user.createdAt ?? user._creationTime,
      lastActiveAt: user.lastActiveAt ?? user._creationTime,
      authProvider: provider === 'google' || provider === 'apple' ? provider : 'email',
      onboarding: user.onboarding,
    };
  },
});

export const updateProfile = mutation({
  args: {
    age: v.number(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    if (!Number.isInteger(args.age) || args.age < 1 || args.age > 120) {
      throw new Error('Invalid age');
    }

    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();
    if (!firstName || !lastName) throw new Error('Name is required');

    const baseUsername =
      firstName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'learner';
    const collisions = await ctx.db
      .query('users')
      .withIndex('normalizedUsername', (q) => q.eq('normalizedUsername', baseUsername))
      .collect();
    const username = collisions.some((candidate) => candidate._id !== userId)
      ? `${baseUsername}_${String(userId).slice(-5).toLowerCase()}`
      : baseUsername;

    await ctx.db.patch(userId, {
      age: args.age,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      username,
      normalizedUsername: username,
      plan: user.plan ?? 'free',
      createdAt: user.createdAt ?? user._creationTime,
      lastActiveAt: Date.now(),
    });

    return { username };
  },
});

export const deleteCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect();
    const sessions = await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .collect();
    const sessionIds = new Set(sessions.map((session) => session._id));

    const learningRecords = await Promise.all([
      ctx.db.query('userCourseProgress').withIndex('by_user_course', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('lessonAttempts').withIndex('by_user_lesson', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('exerciseAttempts').withIndex('by_user_exercise', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('dailyActivity').withIndex('by_user_date', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('learnerRewards').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('monthlyQuestProgress').withIndex('by_user_month', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('lessonRewards').withIndex('by_user_month', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('userAchievements').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('subscriptions').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('leaderboardEntries').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('learnerSessions').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('pushNotificationDeliveries').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
      ctx.db.query('devices').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
    ]);

    for (const records of learningRecords) {
      for (const record of records) await ctx.db.delete(record._id);
    }

    for (const account of accounts) {
      const verificationCodes = await ctx.db
        .query('authVerificationCodes')
        .withIndex('accountId', (q) => q.eq('accountId', account._id))
        .collect();
      const rateLimits = await ctx.db
        .query('authRateLimits')
        .withIndex('identifier', (q) => q.eq('identifier', account._id))
        .collect();

      for (const verificationCode of verificationCodes) {
        await ctx.db.delete(verificationCode._id);
      }

      for (const rateLimit of rateLimits) {
        await ctx.db.delete(rateLimit._id);
      }
    }

    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query('authRefreshTokens')
        .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
        .collect();

      for (const refreshToken of refreshTokens) {
        await ctx.db.delete(refreshToken._id);
      }
    }

    const sessionVerifiers = await ctx.db.query('authVerifiers').collect();

    for (const verifier of sessionVerifiers) {
      if (verifier.sessionId && sessionIds.has(verifier.sessionId)) {
        await ctx.db.delete(verifier._id);
      }
    }

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    await ctx.db.delete(userId);

    return { deleted: true };
  },
});

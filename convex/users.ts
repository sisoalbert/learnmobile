import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import {
  addDateKeyDays,
  currentStreakLength,
  isValidTimezone,
  localDateKey,
  localTimeAt,
  longestStreakLength,
  nextStreakReminderAt,
} from './streakReminderTime';

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
      role: user.role ?? 'user',
      plan: user.plan ?? 'free',
      createdAt: user.createdAt ?? user._creationTime,
      lastActiveAt: user.lastActiveAt ?? user._creationTime,
      timezone: user.timezone,
      lastPracticeAt: user.lastPracticeAt,
      lastStreakEmailAt: user.lastStreakEmailAt,
      nextStreakEmailAt: user.nextStreakEmailAt,
      authProvider: provider === 'google' || provider === 'apple' ? provider : 'email',
      onboarding: user.onboarding,
    };
  },
});

export const syncPracticeReminderContext = mutation({
  args: { timezone: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('UNAUTHENTICATED');
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const timezone = args.timezone.trim();
    if (!isValidTimezone(timezone)) throw new Error('INVALID_TIMEZONE');
    const now = Date.now();
    let lastPracticeAt = user.lastPracticeAt;
    let currentDays = 0;

    if (user.timezone !== timezone || lastPracticeAt === undefined) {
      const completedAttempts = (await ctx.db
        .query('lessonAttempts')
        .withIndex('by_user_status_completed_at', (q) =>
          q.eq('userId', userId).eq('status', 'completed'))
        .collect())
        .filter((attempt) => attempt.completedAt !== undefined);
      const dateKeys = completedAttempts.map((attempt) =>
        localDateKey(attempt.completedAt!, timezone));
      const activityByDate = new Map<string, { lessonsCompleted: number; xpEarned: number }>();
      for (const attempt of completedAttempts) {
        const dateKey = localDateKey(attempt.completedAt!, timezone);
        const existing = activityByDate.get(dateKey) ?? { lessonsCompleted: 0, xpEarned: 0 };
        activityByDate.set(dateKey, {
          lessonsCompleted: existing.lessonsCompleted + 1,
          xpEarned: existing.xpEarned + attempt.xpEarned,
        });
      }

      const existingActivities = await ctx.db
        .query('dailyActivity')
        .withIndex('by_user_date', (q) => q.eq('userId', userId))
        .collect();
      for (const activity of existingActivities) await ctx.db.delete(activity._id);
      for (const [dateKey, activity] of activityByDate) {
        await ctx.db.insert('dailyActivity', {
          userId,
          dateKey,
          ...activity,
          updatedAt: now,
        });
      }

      lastPracticeAt = completedAttempts.reduce<number | undefined>(
        (latest, attempt) => latest === undefined
          ? attempt.completedAt
          : Math.max(latest, attempt.completedAt!),
        undefined,
      );
      const today = localDateKey(now, timezone);
      currentDays = currentStreakLength(dateKeys, today);
      const computedLongest = longestStreakLength(dateKeys);
      const streak = await ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique();
      const lastQualifiedDate = dateKeys.sort().at(-1);
      if (streak) {
        await ctx.db.patch(streak._id, {
          currentDays,
          longestDays: Math.max(streak.longestDays, computedLongest),
          lastQualifiedDate,
          updatedAt: now,
        });
      } else if (lastQualifiedDate) {
        await ctx.db.insert('streaks', {
          userId,
          currentDays,
          longestDays: computedLongest,
          lastQualifiedDate,
          updatedAt: now,
        });
      }
    } else {
      const streak = await ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique();
      currentDays = streak?.currentDays ?? 0;
    }

    let nextStreakEmailAt: number | undefined;
    if (
      user.onboarding?.reminderPreference === 'enabled'
      && user.email?.trim()
      && lastPracticeAt !== undefined
      && currentDays > 0
    ) {
      const today = localDateKey(now, timezone);
      nextStreakEmailAt = user.lastStreakEmailAt !== undefined
        && localDateKey(user.lastStreakEmailAt, timezone) === today
        ? localTimeAt(addDateKeyDays(today, 1), 19, timezone)
        : nextStreakReminderAt(lastPracticeAt, timezone, now);
    }

    await ctx.db.patch(userId, {
      timezone,
      lastPracticeAt,
      nextStreakEmailAt,
      streakEmailVariantIndex: user.streakEmailVariantIndex ?? 0,
    });
    return { timezone, lastPracticeAt: lastPracticeAt ?? null, nextStreakEmailAt: nextStreakEmailAt ?? null };
  },
});

export const updatePracticeReminders = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('UNAUTHENTICATED');
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    const now = Date.now();
    const onboarding = user.onboarding ?? {
      completed: false,
      motivations: [],
      savedAt: now,
    };

    let nextStreakEmailAt: number | undefined;
    if (
      args.enabled
      && user.email?.trim()
      && user.timezone
      && isValidTimezone(user.timezone)
      && user.lastPracticeAt !== undefined
    ) {
      const streak = await ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique();
      if ((streak?.currentDays ?? 0) > 0) {
        const today = localDateKey(now, user.timezone);
        nextStreakEmailAt = user.lastStreakEmailAt !== undefined
          && localDateKey(user.lastStreakEmailAt, user.timezone) === today
          ? localTimeAt(addDateKeyDays(today, 1), 19, user.timezone)
          : nextStreakReminderAt(user.lastPracticeAt, user.timezone, now);
      }
    }

    await ctx.db.patch(userId, {
      onboarding: {
        ...onboarding,
        reminderPreference: args.enabled ? 'enabled' : 'disabled',
        savedAt: now,
      },
      nextStreakEmailAt,
    });
    return { enabled: args.enabled, nextStreakEmailAt: nextStreakEmailAt ?? null };
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

import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import {
  addDateKeyDays,
  isValidTimezone,
  localDateKey,
  localTimeAt,
  nextStreakReminderAt,
  nextStreakPushReminderAt,
  streakFreezeState,
} from './streakReminderTime';
import {
  hasStreakReminderTarget,
  sentStreakReminderOnLocalDate,
  streakReminderEligibility,
} from './streakReminderRules';

const BATCH_SIZE = 100;
const RETRY_DELAY_MS = 30 * 60 * 1000;

const queueDueRef = makeFunctionReference<'mutation', Record<string, never>, null>(
  'streakReminders:queueDueStreakReminders',
);
const queueDuePushRef = makeFunctionReference<'mutation', Record<string, never>, null>(
  'streakReminders:queueDueStreakPushReminders',
);
const sendReminderRef = makeFunctionReference<
  'action',
  { userId: Id<'users'>; localDate: string },
  null
>('streakReminderEmail:sendStreakReminderEmail');
const sendPushReminderRef = makeFunctionReference<
  'action',
  { userId: Id<'users'>; localDate: string },
  null
>('notifications:sendStreakReminderPush');
const advanceStreakFreezeRef = makeFunctionReference<
  'mutation',
  { userId: Id<'users'>; lastQualifiedDate: string },
  null
>('streakReminders:advanceStreakFreeze');

function remindersEnabled(user: Doc<'users'>) {
  return user.onboarding?.reminderPreference === 'enabled';
}

function reminderEligibility(
  user: Doc<'users'>,
  streak: Doc<'streaks'> | null,
  now: number,
) {
  if (!streak) return null;
  return streakReminderEligibility({
    timezone: user.timezone,
    reminderPreference: user.onboarding?.reminderPreference,
    lastPracticeAt: user.lastPracticeAt,
    lastQualifiedDate: streak.lastQualifiedDate,
    currentStreakDays: streak.currentDays,
  }, now);
}

function emailEligibility(user: Doc<'users'>, streak: Doc<'streaks'> | null, now: number) {
  const context = reminderEligibility(user, streak, now);
  const email = user.email?.trim();
  if (
    !context
    || !email
    || sentStreakReminderOnLocalDate(user.lastStreakEmailAt, user.timezone, context.localDate)
  ) {
    return null;
  }
  return { ...context, email };
}

function pushEligibility(user: Doc<'users'>, streak: Doc<'streaks'> | null, now: number) {
  const context = reminderEligibility(user, streak, now);
  return context
    && !sentStreakReminderOnLocalDate(user.lastStreakPushAt, user.timezone, context.localDate)
    ? context
    : null;
}

async function reconcileSchedule(
  ctx: MutationCtx,
  user: Doc<'users'>,
  streak: Doc<'streaks'> | null,
  now: number,
) {
  if (
    !user.timezone
    || !isValidTimezone(user.timezone)
    || user.lastPracticeAt === undefined
    || !streak
  ) {
    await ctx.db.patch(user._id, { nextStreakEmailAt: undefined, nextStreakPushAt: undefined });
    return;
  }

  const today = localDateKey(now, user.timezone);
  const lastQualifiedDate = streak.lastQualifiedDate
    ?? localDateKey(user.lastPracticeAt, user.timezone);
  const freezeState = streakFreezeState(
    streak.currentDays,
    lastQualifiedDate,
    today,
  );
  if (
    streak.currentDays !== freezeState.currentDays
    || (streak.frozenDaysUsed ?? 0) !== freezeState.frozenDaysUsed
    || streak.freezeStartedDate !== freezeState.freezeStartedDate
  ) {
    await ctx.db.patch(streak._id, {
      currentDays: freezeState.currentDays,
      frozenDaysUsed: freezeState.frozenDaysUsed,
      freezeStartedDate: freezeState.freezeStartedDate,
      updatedAt: now,
    });
  }

  if (freezeState.currentDays === 0 || !remindersEnabled(user)) {
    await ctx.db.patch(user._id, { nextStreakEmailAt: undefined, nextStreakPushAt: undefined });
    return;
  }

  const pushDevices = await ctx.db.query('devices')
    .withIndex('by_user_push_enabled', (q) => q.eq('userId', user._id).eq('pushEnabled', true))
    .collect();
  const hasPushToken = pushDevices.some((device) => hasStreakReminderTarget(device.expoPushToken));
  const nextStreakEmailAt = sentStreakReminderOnLocalDate(user.lastStreakEmailAt, user.timezone, today)
    ? localTimeAt(addDateKeyDays(today, 1), 19, user.timezone)
    : nextStreakReminderAt(user.lastPracticeAt, user.timezone, now);
  const nextStreakPushAt = sentStreakReminderOnLocalDate(user.lastStreakPushAt, user.timezone, today)
    ? localTimeAt(addDateKeyDays(today, 1), 20, user.timezone)
    : nextStreakPushReminderAt(user.lastPracticeAt, user.timezone, now);
  await ctx.db.patch(user._id, {
    nextStreakEmailAt: user.email?.trim() ? nextStreakEmailAt : undefined,
    nextStreakPushAt: hasPushToken ? nextStreakPushAt : undefined,
  });
}

export const queueDueStreakReminders = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const now = Date.now();
    const dueUsers = await ctx.db
      .query('users')
      .withIndex('by_nextStreakEmailAt', (q) =>
        q.gt('nextStreakEmailAt', 0).lte('nextStreakEmailAt', now))
      .take(BATCH_SIZE);

    for (const user of dueUsers) {
      const streak = await ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .unique();
      const context = emailEligibility(user, streak, now);
      if (!context) {
        await reconcileSchedule(ctx, user, streak, now);
        continue;
      }

      await ctx.db.patch(user._id, { nextStreakEmailAt: now + RETRY_DELAY_MS });
      await ctx.scheduler.runAfter(0, sendReminderRef, {
        userId: user._id,
        localDate: context.localDate,
      });
    }

    if (dueUsers.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(1000, queueDueRef, {});
    }
    return null;
  },
});

export const queueDueStreakPushReminders = internalMutation({
  args: {},
  handler: async (ctx): Promise<null> => {
    const now = Date.now();
    const dueUsers = await ctx.db
      .query('users')
      .withIndex('by_nextStreakPushAt', (q) =>
        q.gt('nextStreakPushAt', 0).lte('nextStreakPushAt', now))
      .take(BATCH_SIZE);

    for (const user of dueUsers) {
      const streak = await ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', user._id)).unique();
      const context = pushEligibility(user, streak, now);
      if (!context) {
        await reconcileSchedule(ctx, user, streak, now);
        continue;
      }
      await ctx.db.patch(user._id, { nextStreakPushAt: now + RETRY_DELAY_MS });
      await ctx.scheduler.runAfter(0, sendPushReminderRef, { userId: user._id, localDate: context.localDate });
    }
    if (dueUsers.length === BATCH_SIZE) await ctx.scheduler.runAfter(1000, queueDuePushRef, {});
    return null;
  },
});

export const getStreakReminderContext = internalQuery({
  args: { userId: v.id('users'), localDate: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const [user, streak] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .unique(),
    ]);
    if (!user) return null;
    const context = emailEligibility(user, streak, now);
    return context?.localDate === args.localDate ? context : null;
  },
});

export const getStreakReminderPushContext = internalQuery({
  args: { userId: v.id('users'), localDate: v.string() },
  handler: async (ctx, args) => {
    const [user, streak] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', args.userId)).unique(),
    ]);
    if (!user) return null;
    const context = pushEligibility(user, streak, Date.now());
    if (!context || context.localDate !== args.localDate) return null;
    const devices = await ctx.db.query('devices')
      .withIndex('by_user_push_enabled', (q) => q.eq('userId', args.userId).eq('pushEnabled', true))
      .collect();
    const activeDevices = devices.flatMap((device) => device.expoPushToken ? [{
      deviceId: device._id,
      expoPushToken: device.expoPushToken,
    }] : []);
    if (activeDevices.length === 0) return null;
    return {
      ...context,
      devices: activeDevices,
    };
  },
});

export const reconcileStreakReminder = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    const streak = await ctx.db
      .query('streaks')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    await reconcileSchedule(ctx, user, streak, Date.now());
    return null;
  },
});

export const advanceStreakFreeze = internalMutation({
  args: { userId: v.id('users'), lastQualifiedDate: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const [user, streak] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .unique(),
    ]);
    if (
      !user
      || !streak
      || streak.lastQualifiedDate !== args.lastQualifiedDate
      || !user.timezone
      || !isValidTimezone(user.timezone)
    ) return null;

    const now = Date.now();
    const today = localDateKey(now, user.timezone);
    const freezeState = streakFreezeState(streak.currentDays, args.lastQualifiedDate, today);
    await ctx.db.patch(streak._id, {
      currentDays: freezeState.currentDays,
      frozenDaysUsed: freezeState.frozenDaysUsed,
      freezeStartedDate: freezeState.freezeStartedDate,
      updatedAt: now,
    });

    if (!freezeState.expired && freezeState.currentDays > 0) {
      await ctx.scheduler.runAt(
        localTimeAt(addDateKeyDays(today, 1), 0, user.timezone),
        advanceStreakFreezeRef,
        args,
      );
    }
    return null;
  },
});

export const finalizeStreakReminder = internalMutation({
  args: {
    userId: v.id('users'),
    localDate: v.string(),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.timezone || localDateKey(args.sentAt, user.timezone) !== args.localDate) {
      return null;
    }
    await ctx.db.patch(args.userId, {
      lastStreakEmailAt: args.sentAt,
      nextStreakEmailAt: localTimeAt(addDateKeyDays(args.localDate, 1), 19, user.timezone),
    });
    const streak = await ctx.db.query('streaks')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    if (streak) {
      const freezeState = streakFreezeState(
        streak.currentDays,
        streak.lastQualifiedDate
          ?? (user.lastPracticeAt === undefined
            ? undefined
            : localDateKey(user.lastPracticeAt, user.timezone)),
        args.localDate,
      );
      await ctx.db.patch(streak._id, {
        currentDays: freezeState.currentDays,
        frozenDaysUsed: freezeState.frozenDaysUsed,
        freezeStartedDate: freezeState.freezeStartedDate,
        lastFreezeReminderDate: args.localDate,
        updatedAt: args.sentAt,
      });
    }
    return null;
  },
});

export const retryStreakReminder = internalMutation({
  args: { userId: v.id('users'), localDate: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const user = await ctx.db.get(args.userId);
    if (!user || !user.timezone || localDateKey(now, user.timezone) !== args.localDate) {
      if (user) await ctx.db.patch(user._id, { nextStreakEmailAt: undefined });
      return null;
    }
    const streak = await ctx.db
      .query('streaks')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    if (emailEligibility(user, streak, now)) {
      await ctx.db.patch(user._id, { nextStreakEmailAt: now + RETRY_DELAY_MS });
    } else {
      await reconcileSchedule(ctx, user, streak, now);
    }
    return null;
  },
});

export const finalizeStreakPushReminder = internalMutation({
  args: { userId: v.id('users'), localDate: v.string(), sentAt: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.timezone || localDateKey(args.sentAt, user.timezone) !== args.localDate) return null;
    await ctx.db.patch(args.userId, {
      lastStreakPushAt: args.sentAt,
      nextStreakPushAt: localTimeAt(addDateKeyDays(args.localDate, 1), 20, user.timezone),
    });
    const streak = await ctx.db.query('streaks')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    if (streak) {
      const freezeState = streakFreezeState(
        streak.currentDays,
        streak.lastQualifiedDate
          ?? (user.lastPracticeAt === undefined
            ? undefined
            : localDateKey(user.lastPracticeAt, user.timezone)),
        args.localDate,
      );
      await ctx.db.patch(streak._id, {
        currentDays: freezeState.currentDays,
        frozenDaysUsed: freezeState.frozenDaysUsed,
        freezeStartedDate: freezeState.freezeStartedDate,
        lastFreezeReminderDate: args.localDate,
        updatedAt: args.sentAt,
      });
    }
    return null;
  },
});

export const retryStreakPushReminder = internalMutation({
  args: { userId: v.id('users'), localDate: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const user = await ctx.db.get(args.userId);
    if (!user || !user.timezone || localDateKey(now, user.timezone) !== args.localDate) {
      if (user) await ctx.db.patch(user._id, { nextStreakPushAt: undefined });
      return null;
    }
    const streak = await ctx.db.query('streaks').withIndex('by_user', (q) => q.eq('userId', args.userId)).unique();
    if (pushEligibility(user, streak, now)) {
      await ctx.db.patch(user._id, { nextStreakPushAt: now + RETRY_DELAY_MS });
    } else {
      await reconcileSchedule(ctx, user, streak, now);
    }
    return null;
  },
});

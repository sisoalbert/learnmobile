import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import {
  addDateKeyDays,
  effectiveStreakDays,
  isValidTimezone,
  localDateKey,
  localTimeAt,
  nextStreakReminderAt,
} from './streakReminderTime';
import { streakReminderEligibility } from './streakReminderRules';
import { nextStreakReminderVariant } from './streakReminderContent';

const BATCH_SIZE = 100;
const RETRY_DELAY_MS = 30 * 60 * 1000;

const queueDueRef = makeFunctionReference<'mutation', Record<string, never>, null>(
  'streakReminders:queueDueStreakReminders',
);
const sendReminderRef = makeFunctionReference<
  'action',
  { userId: Id<'users'>; localDate: string },
  null
>('streakReminderEmail:sendStreakReminderEmail');

function remindersEnabled(user: Doc<'users'>) {
  return user.onboarding?.reminderPreference === 'enabled';
}

function sentOnDate(user: Doc<'users'>, dateKey: string) {
  return user.lastStreakEmailAt !== undefined
    && user.timezone !== undefined
    && localDateKey(user.lastStreakEmailAt, user.timezone) === dateKey;
}

function eligibility(
  user: Doc<'users'>,
  streak: Doc<'streaks'> | null,
  now: number,
) {
  if (!streak) return null;
  return streakReminderEligibility({
    email: user.email,
    timezone: user.timezone,
    reminderPreference: user.onboarding?.reminderPreference,
    lastPracticeAt: user.lastPracticeAt,
    lastStreakEmailAt: user.lastStreakEmailAt,
    currentStreakDays: streak.currentDays,
    variantIndex: user.streakEmailVariantIndex,
  }, now);
}

async function reconcileSchedule(
  ctx: MutationCtx,
  user: Doc<'users'>,
  streak: Doc<'streaks'> | null,
  now: number,
) {
  if (
    !remindersEnabled(user)
    || !user.email?.trim()
    || !user.timezone
    || !isValidTimezone(user.timezone)
    || user.lastPracticeAt === undefined
    || !streak
  ) {
    await ctx.db.patch(user._id, { nextStreakEmailAt: undefined });
    return;
  }

  const currentDays = effectiveStreakDays(
    streak.currentDays,
    user.lastPracticeAt,
    user.timezone,
    now,
  );
  if (currentDays === 0) {
    if (streak.currentDays !== 0) {
      await ctx.db.patch(streak._id, { currentDays: 0, updatedAt: now });
    }
    await ctx.db.patch(user._id, { nextStreakEmailAt: undefined });
    return;
  }

  const today = localDateKey(now, user.timezone);
  const nextStreakEmailAt = sentOnDate(user, today)
    ? localTimeAt(addDateKeyDays(today, 1), 19, user.timezone)
    : nextStreakReminderAt(user.lastPracticeAt, user.timezone, now);
  await ctx.db.patch(user._id, { nextStreakEmailAt });
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
      const context = eligibility(user, streak, now);
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
    const context = eligibility(user, streak, now);
    return context?.localDate === args.localDate ? context : null;
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

export const finalizeStreakReminder = internalMutation({
  args: {
    userId: v.id('users'),
    localDate: v.string(),
    sentAt: v.number(),
    variantIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.timezone || localDateKey(args.sentAt, user.timezone) !== args.localDate) {
      return null;
    }
    await ctx.db.patch(args.userId, {
      lastStreakEmailAt: args.sentAt,
      nextStreakEmailAt: localTimeAt(addDateKeyDays(args.localDate, 1), 19, user.timezone),
      streakEmailVariantIndex: nextStreakReminderVariant(args.variantIndex),
    });
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
    if (eligibility(user, streak, now)) {
      await ctx.db.patch(user._id, { nextStreakEmailAt: now + RETRY_DELAY_MS });
    } else {
      await reconcileSchedule(ctx, user, streak, now);
    }
    return null;
  },
});

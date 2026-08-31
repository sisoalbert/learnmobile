import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { internalMutation } from './_generated/server';

const revenueCatProvider = 'revenuecat';

const sendSubscriptionWelcomeEmail = makeFunctionReference<
  'action',
  { email: string; firstName?: string; userId: Id<'users'> },
  { id: string }
>('emails:sendSubscriptionWelcomeEmail');

export const syncSubscriber = internalMutation({
  args: {
    appUserId: v.string(),
    eventId: v.string(),
    eventTimestamp: v.number(),
    externalSubscriptionId: v.optional(v.string()),
    hasPro: v.boolean(),
    isTrial: v.boolean(),
    periodEndsAt: v.optional(v.number()),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const duplicate = await ctx.db
      .query('revenueCatWebhookEvents')
      .withIndex('by_event_id', (q) => q.eq('eventId', args.eventId))
      .unique();
    if (duplicate) return { outcome: 'duplicate' as const };

    const userId = args.appUserId as Id<'users'>;
    const user = await ctx.db.get(userId);
    if (!user) return { outcome: 'unknown_user' as const };
    const shouldSendSubscriptionWelcomeEmail = args.hasPro
      && user.plan !== 'premium'
      && Boolean(user.email?.trim());

    const status = args.hasPro
      ? args.isTrial ? 'trialing' as const : 'active' as const
      : 'inactive' as const;
    const existingSubscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user_and_provider', (q) => q.eq('userId', userId).eq('provider', revenueCatProvider))
      .first();
    const subscription = {
      provider: revenueCatProvider,
      externalSubscriptionId: args.externalSubscriptionId,
      productId: args.productId,
      status,
      periodEndsAt: args.periodEndsAt,
      updatedAt: args.eventTimestamp,
    };

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, subscription);
    } else {
      await ctx.db.insert('subscriptions', { userId, ...subscription });
    }

    await ctx.db.patch(userId, { plan: args.hasPro ? 'premium' : 'free' });
    await ctx.db.insert('revenueCatWebhookEvents', {
      appUserId: args.appUserId,
      eventId: args.eventId,
      receivedAt: Date.now(),
    });

    if (shouldSendSubscriptionWelcomeEmail && user.email) {
      await ctx.scheduler.runAfter(0, sendSubscriptionWelcomeEmail, {
        email: user.email,
        userId,
        ...(user.firstName ? { firstName: user.firstName } : {}),
      });
    }

    return { outcome: 'synced' as const };
  },
});

export const revenueCatSyncSubscriberRef = makeFunctionReference<
  'mutation',
  {
    appUserId: string;
    eventId: string;
    eventTimestamp: number;
    externalSubscriptionId?: string;
    hasPro: boolean;
    isTrial: boolean;
    periodEndsAt?: number;
    productId: string;
  },
  { outcome: 'duplicate' | 'synced' | 'unknown_user' }
>('revenueCat:syncSubscriber');

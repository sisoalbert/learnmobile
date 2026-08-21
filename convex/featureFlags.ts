import { v } from 'convex/values';

import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { requireAdmin } from './authz';
import { resolveMobileAdsFlags } from './mobileAdFlags';

const MOBILE_ADS_FLAG_KEY = 'react-native-google-mobile-ads';
const IN_LESSON_ADS_FLAG_KEY = 'mobile-ads-in-lesson';
const END_OF_LESSON_ADS_FLAG_KEY = 'mobile-ads-end-of-lesson';

export type MobileAdPlacement = 'inLesson' | 'endOfLesson';

async function getFlag(ctx: QueryCtx | MutationCtx, key: string) {
  return ctx.db
    .query('featureFlags')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique();
}

async function setFlag(ctx: MutationCtx, key: string, enabled: boolean) {
  const existing = await getFlag(ctx, key);
  const updatedAt = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, { enabled, updatedAt });
  } else {
    await ctx.db.insert('featureFlags', { key, enabled, updatedAt });
  }
}

export const getMobileAdsEnabled = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const flag = await getFlag(ctx, MOBILE_ADS_FLAG_KEY);

    return flag?.enabled ?? false;
  },
});

export const getMobileAdsFlags = query({
  args: {},
  returns: v.object({
    inLesson: v.boolean(),
    endOfLesson: v.boolean(),
  }),
  handler: async (ctx) => {
    const [legacy, inLesson, endOfLesson] = await Promise.all([
      getFlag(ctx, MOBILE_ADS_FLAG_KEY),
      getFlag(ctx, IN_LESSON_ADS_FLAG_KEY),
      getFlag(ctx, END_OF_LESSON_ADS_FLAG_KEY),
    ]);

    return resolveMobileAdsFlags({
      legacy: legacy?.enabled,
      inLesson: inLesson?.enabled,
      endOfLesson: endOfLesson?.enabled,
    });
  },
});

export const setMobileAdsEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: v.boolean(),
  handler: async (ctx, { enabled }) => {
    await requireAdmin(ctx);
    await setFlag(ctx, MOBILE_ADS_FLAG_KEY, enabled);

    return enabled;
  },
});

export const setMobileAdsFlag = mutation({
  args: {
    placement: v.union(v.literal('inLesson'), v.literal('endOfLesson')),
    enabled: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, { placement, enabled }) => {
    await requireAdmin(ctx);
    await setFlag(
      ctx,
      placement === 'inLesson' ? IN_LESSON_ADS_FLAG_KEY : END_OF_LESSON_ADS_FLAG_KEY,
      enabled,
    );
    return enabled;
  },
});

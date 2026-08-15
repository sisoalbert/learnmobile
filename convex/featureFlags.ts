import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin } from './authz';

const MOBILE_ADS_FLAG_KEY = 'react-native-google-mobile-ads';

export const getMobileAdsEnabled = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const flag = await ctx.db
      .query('featureFlags')
      .withIndex('by_key', (q) => q.eq('key', MOBILE_ADS_FLAG_KEY))
      .unique();

    return flag?.enabled ?? false;
  },
});

export const setMobileAdsEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: v.boolean(),
  handler: async (ctx, { enabled }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query('featureFlags')
      .withIndex('by_key', (q) => q.eq('key', MOBILE_ADS_FLAG_KEY))
      .unique();
    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { enabled, updatedAt });
    } else {
      await ctx.db.insert('featureFlags', {
        key: MOBILE_ADS_FLAG_KEY,
        enabled,
        updatedAt,
      });
    }

    return enabled;
  },
});

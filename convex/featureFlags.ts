import { query } from './_generated/server';

const MOBILE_ADS_FLAG_KEY = 'react-native-google-mobile-ads';

export const getMobileAdsEnabled = query({
  args: {},
  handler: async (ctx) => {
    const flag = await ctx.db
      .query('featureFlags')
      .withIndex('by_key', (q) => q.eq('key', MOBILE_ADS_FLAG_KEY))
      .unique();

    return flag?.enabled ?? false;
  },
});

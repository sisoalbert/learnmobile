import { getAuthUserId } from '@convex-dev/auth/server';

import { query } from './_generated/server';

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

    return {
      email: user.email,
      name: user.name,
    };
  },
});

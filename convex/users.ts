import { getAuthUserId } from '@convex-dev/auth/server';

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

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      age: user.age,
      firstName: user.firstName,
      lastName: user.lastName,
    };
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

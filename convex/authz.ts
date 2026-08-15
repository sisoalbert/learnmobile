import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';

import type { MutationCtx, QueryCtx } from './_generated/server';

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({ code: 'UNAUTHENTICATED' });
  }

  const user = await ctx.db.get(userId);
  if (!user || user.role !== 'admin') {
    throw new ConvexError({ code: 'ADMIN_REQUIRED' });
  }

  return user;
}

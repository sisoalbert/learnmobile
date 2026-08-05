import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import { makeFunctionReference } from 'convex/server';

import { ResendOTPPasswordReset } from './passwordReset';
import { buildUserOnboarding } from './onboarding';

const usernameFromProfile = (email: string, firstName: string) => {
  const source = firstName || email.split('@')[0] || 'learner';
  return source.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'learner';
};

const sendWelcomeEmail = makeFunctionReference<
  'action',
  { email: string },
  { id: string }
>('emails:sendWelcomeEmail');

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: ResendOTPPasswordReset,
      profile: (params) => {
        if (typeof params.email !== 'string') {
          throw new Error('Missing email');
        }

        const name = typeof params.name === 'string' ? params.name.trim() : '';
        const firstName = typeof params.firstName === 'string' ? params.firstName.trim() : '';
        const lastName = typeof params.lastName === 'string' ? params.lastName.trim() : '';
        const age = typeof params.age === 'number' ? params.age : null;
        const onboarding = params.flow === 'signUp'
          ? buildUserOnboarding(params.onboarding)
          : undefined;
        const username = usernameFromProfile(params.email, firstName);

        if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
          throw new Error('Invalid age');
        }

        return {
          email: params.email.trim().toLowerCase(),
          ...(name ? { name } : {}),
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(age !== null ? { age } : {}),
          ...(onboarding ? { onboarding } : {}),
          ...(params.flow === 'signUp' ? {
            username,
            normalizedUsername: username,
            plan: 'free' as const,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
          } : {}),
        };
      },
    }),
  ],
  callbacks: {
    afterUserCreatedOrUpdated: async (ctx, { userId, existingUserId, profile }) => {
      const user = await ctx.db.get(userId);
      if (user) {
        const base = user.normalizedUsername
          ?? usernameFromProfile(user.email ?? 'learner@example.com', user.firstName ?? '');
        const collisions = await ctx.db
          .query('users')
          .filter((q) => q.eq(q.field('normalizedUsername'), base))
          .collect();
        const normalizedUsername = collisions.some((candidate) => candidate._id !== userId)
          ? `${base}_${String(userId).slice(-5).toLowerCase()}`
          : base;
        await ctx.db.patch(userId, {
          username: normalizedUsername,
          normalizedUsername,
          plan: user.plan ?? 'free',
          createdAt: user.createdAt ?? user._creationTime,
          lastActiveAt: Date.now(),
        });
      }

      if (existingUserId !== null || typeof profile.email !== 'string') return;

      await ctx.scheduler.runAfter(0, sendWelcomeEmail, {
        email: profile.email,
      });
    },
  },
});

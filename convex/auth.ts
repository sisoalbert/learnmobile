import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import { makeFunctionReference } from 'convex/server';

import { ResendOTPPasswordReset } from './passwordReset';

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

        return {
          email: params.email.trim().toLowerCase(),
          ...(name ? { name } : {}),
        };
      },
    }),
  ],
  callbacks: {
    afterUserCreatedOrUpdated: async (ctx, { existingUserId, profile }) => {
      if (existingUserId !== null || typeof profile.email !== 'string') {
        return;
      }

      await ctx.scheduler.runAfter(0, sendWelcomeEmail, {
        email: profile.email,
      });
    },
  },
});

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
  providers: [Password({ reset: ResendOTPPasswordReset })],
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

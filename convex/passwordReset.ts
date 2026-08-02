import Resend from '@auth/core/providers/resend';
import { RandomReader, generateRandomString } from '@oslojs/crypto/random';
import { Resend as ResendAPI } from 'resend';

const DEFAULT_FROM = 'Learn Expo <security@updates.learnexpo.online>';

export const ResendOTPPasswordReset = Resend({
  id: 'resend-otp-password-reset',
  apiKey: process.env.RESEND_API_KEY,
  maxAge: 60 * 15,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        const randomBytes = crypto.getRandomValues(new Uint8Array(bytes.length));
        bytes.set(randomBytes);
      },
    };

    return generateRandomString(random, '0123456789', 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: process.env.PASSWORD_RESET_EMAIL_FROM ?? DEFAULT_FROM,
      to: email,
      subject: 'Reset your Learn Expo password',
      html: `
        <div style="font-family: Arial, sans-serif; color: #4b4b4b; line-height: 1.6;">
          <h1 style="color: #1cb0f6;">Reset your password</h1>
          <p>Enter this code in Learn Expo within 15 minutes to choose a new password:</p>
          <p style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1899d6;">${token}</p>
          <p>If you didn’t request this change, you can safely ignore this email.</p>
        </div>
      `,
      text: [
        'Reset your Learn Expo password',
        '',
        `Your password reset code is ${token}. It expires in 15 minutes.`,
        '',
        'If you didn’t request this change, you can safely ignore this email.',
      ].join('\n'),
    });

    if (error) {
      throw new Error(error.message);
    }
  },
});

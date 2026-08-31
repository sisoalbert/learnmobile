"use node";

import { Resend } from "resend";
import { v } from "convex/values";

import { internalAction } from "./_generated/server";

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
  },
  handler: async (_ctx, { email }): Promise<{ id: string }> => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(apiKey);
    const recipient = process.env.RESEND_TEST_RECIPIENT ?? email;
    const from =
      process.env.WELCOME_EMAIL_FROM ??
      "Learn Expo <onboarding@updates.learnexpo.online>";
    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      subject: "Welcome to Learn Expo!",
      html: `
        <div style="font-family: Arial, sans-serif; color: #4b4b4b; line-height: 1.6;">
          <h1 style="color: #1cb0f6;">Welcome to Learn Expo!</h1>
          <p>Your account is ready.</p>
          <p>We’re excited to help you build your React Native and Expo skills, one lesson at a time.</p>
          <p>Happy learning!</p>
        </div>
      `,
      text: [
        "Welcome to Learn Expo!",
        "",
        "Your account is ready.",
        "We’re excited to help you build your React Native and Expo skills, one lesson at a time.",
        "",
        "Happy learning!",
      ].join("\n"),
    });

    if (error || !data) {
      throw new Error(error?.message ?? "Resend did not return an email ID");
    }

    return { id: data.id };
  },
});

export const sendSubscriptionWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    userId: v.id('users'),
  },
  handler: async (_ctx, { email, firstName, userId }): Promise<{ id: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

    const resend = new Resend(apiKey);
    const recipient = process.env.RESEND_TEST_RECIPIENT ?? email;
    const from = process.env.PREMIUM_EMAIL_FROM
      ?? process.env.WELCOME_EMAIL_FROM
      ?? 'Learn Expo <onboarding@updates.learnexpo.online>';
    const learnerName = escapeHtml(firstName?.trim() || 'there');
    const learningUrl = 'https://learnexpo.online/home';
    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      subject: 'Welcome to Learn Expo Pro! 🦖',
      html: `
        <div style="background:#f8fafd;padding:32px 16px;font-family:Arial,sans-serif;color:#17213b;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;box-shadow:0 8px 24px rgba(23,33,59,.08);">
            <div style="font-size:42px;line-height:1;text-align:center;">🦖</div>
            <h1 style="margin:18px 0 12px;text-align:center;font-size:28px;line-height:1.2;color:#8757d8;">You’re now Learn Expo Pro!</h1>
            <p style="font-size:17px;line-height:1.6;color:#4b5565;">Hi ${learnerName}, your Pro access is active. Learn without ads, practice without limits, and make the most of every lesson.</p>
            <div style="text-align:center;"><a href="${learningUrl}" style="display:inline-block;background:#2289fd;color:#ffffff;text-decoration:none;font-weight:900;padding:15px 24px;border-radius:14px;">Continue learning</a></div>
          </div>
        </div>
      `,
      text: [
        'Welcome to Learn Expo Pro!',
        '',
        `Hi ${firstName?.trim() || 'there'}, your Pro access is active.`,
        'Learn without ads, practice without limits, and make the most of every lesson.',
        '',
        `Continue learning: ${learningUrl}`,
      ].join('\n'),
      tags: [{ name: 'email_type', value: 'subscription_welcome' }],
    }, {
      idempotencyKey: `subscription-welcome:${userId}`,
    });

    if (error || !data) throw new Error(error?.message ?? 'Resend did not return an email ID');
    return { id: data.id };
  },
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const sendAccountDeletionConfirmationEmail = internalAction({
  args: {
    email: v.string(),
    confirmationUrl: v.string(),
  },
  handler: async (_ctx, { email, confirmationUrl }): Promise<{ id: string }> => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(apiKey);
    const from =
      process.env.WELCOME_EMAIL_FROM ??
      "Learn Expo <onboarding@updates.learnexpo.online>";
    const recipient = process.env.RESEND_TEST_RECIPIENT ?? email;
    const safeUrl = escapeHtml(confirmationUrl);

    const { data, error } = await resend.emails.send({
      from,
      to: recipient,
      subject: 'Confirm your Learn Expo account deletion request',
      html: `
        <div style="font-family: Arial, sans-serif; color: #4b4b4b; line-height: 1.6;">
          <h1 style="color: #1cb0f6;">Confirm account deletion</h1>
          <p>We received a request to delete your Learn Expo account.</p>
          <p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#c43d3d;color:#fff;text-decoration:none;font-weight:700">Confirm deletion request</a></p>
          <p>This link expires in 30 minutes. If you did not make this request, ignore this email.</p>
        </div>
      `,
      text: [
        'Confirm your Learn Expo account deletion request',
        '',
        'Open this link within 30 minutes:',
        confirmationUrl,
        '',
        'If you did not make this request, ignore this email.',
      ].join('\n'),
    });

    if (error || !data) {
      throw new Error(error?.message ?? "Resend did not return an email ID");
    }

    return { id: data.id };
  },
});

export const sendVerifiedAccountDeletionEmail = internalAction({
  args: { email: v.string() },
  handler: async (_ctx, { email }): Promise<{ id: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

    const resend = new Resend(apiKey);
    const from = process.env.WELCOME_EMAIL_FROM
      ?? 'Learn Expo <onboarding@updates.learnexpo.online>';
    const to = process.env.ACCOUNT_DELETION_ADMIN_EMAIL ?? 'admin@learnexpo.online';
    const safeEmail = escapeHtml(email);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Verified account deletion request: ${email}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #4b4b4b; line-height: 1.6;">
          <h1 style="color: #c43d3d;">Verified account deletion request</h1>
          <p>The owner confirmed control of this email address:</p>
          <p><strong>${safeEmail}</strong></p>
          <p>Open the Learn Expo admin dashboard to review and delete the account.</p>
        </div>
      `,
      text: `Verified account deletion request\n\nEmail: ${email}\n\nOpen the Learn Expo admin dashboard to review and delete the account.`,
    });
    if (error || !data) throw new Error(error?.message ?? 'Resend did not return an email ID');
    return { id: data.id };
  },
});

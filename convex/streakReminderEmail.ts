"use node";

import { Resend } from 'resend';
import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { internalAction } from './_generated/server';
import {
  streakReminderIdempotencyKey,
  streakReminderTemplate,
} from './streakReminderContent';

type ReminderContext = {
  email: string;
  localDate: string;
  streakDays: number;
  timezone: string;
  variantIndex: number;
} | null;

const getReminderContextRef = makeFunctionReference<
  'query',
  { userId: Id<'users'>; localDate: string },
  ReminderContext
>('streakReminders:getStreakReminderContext');
const reconcileReminderRef = makeFunctionReference<
  'mutation',
  { userId: Id<'users'> },
  null
>('streakReminders:reconcileStreakReminder');
const retryReminderRef = makeFunctionReference<
  'mutation',
  { userId: Id<'users'>; localDate: string },
  null
>('streakReminders:retryStreakReminder');
const finalizeReminderRef = makeFunctionReference<
  'mutation',
  {
    userId: Id<'users'>;
    localDate: string;
    sentAt: number;
    variantIndex: number;
  },
  null
>('streakReminders:finalizeStreakReminder');

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const sendStreakReminderEmail = internalAction({
  args: { userId: v.id('users'), localDate: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(
      getReminderContextRef,
      args,
    );
    if (!context) {
      await ctx.runMutation(reconcileReminderRef, {
        userId: args.userId,
      });
      return null;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(retryReminderRef, args);
      throw new Error('RESEND_API_KEY is not configured');
    }

    const template = streakReminderTemplate(context.variantIndex);
    const recipient = process.env.RESEND_TEST_RECIPIENT ?? context.email;
    const from = process.env.STREAK_EMAIL_FROM
      ?? 'Rex at Learn Expo <reminders@updates.learnexpo.online>';
    const learningUrl = 'https://learnexpo.online/home';
    const settingsUrl = 'https://learnexpo.online/profile/settings';
    const streakLabel = `${context.streakDays}-day streak`;

    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from,
        to: recipient,
        subject: template.subject,
        html: `
          <div style="background:#f8fafd;padding:32px 16px;font-family:Arial,sans-serif;color:#17213b;">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;box-shadow:0 8px 24px rgba(23,33,59,.08);">
              <div style="font-size:42px;line-height:1;text-align:center;">🦖</div>
              <p style="margin:10px 0 0;text-align:center;color:#667085;font-weight:700;">Rex from Learn Expo</p>
              <h1 style="margin:18px 0 12px;text-align:center;font-size:28px;line-height:1.2;color:#f28b19;">Your ${escapeHtml(streakLabel)} is at risk 🔥</h1>
              <p style="margin:0 0 26px;font-size:17px;line-height:1.6;color:#4b5565;">${escapeHtml(template.body)}</p>
              <div style="text-align:center;">
                <a href="${escapeHtml(learningUrl)}" style="display:inline-block;background:#2289fd;color:#ffffff;text-decoration:none;font-weight:900;padding:15px 24px;border-radius:14px;">${escapeHtml(template.cta)}</a>
              </div>
              <p style="margin:28px 0 0;text-align:center;font-size:12px;color:#98a2b3;">You enabled practice reminders in Learn Expo. <a href="${escapeHtml(settingsUrl)}" style="color:#667085;">Manage reminders</a>.</p>
            </div>
          </div>
        `,
        text: [
          `Rex here — your ${streakLabel} is at risk!`,
          '',
          template.body,
          '',
          `${template.cta}: ${learningUrl}`,
          '',
          `Manage reminders: ${settingsUrl}`,
        ].join('\n'),
        tags: [
          { name: 'email_type', value: 'streak_reminder' },
          { name: 'template_id', value: template.id },
        ],
      }, {
        idempotencyKey: streakReminderIdempotencyKey(args.userId, args.localDate),
      });

      if (error || !data) {
        throw new Error(error?.message ?? 'Resend did not return an email ID');
      }

      await ctx.runMutation(finalizeReminderRef, {
        userId: args.userId,
        localDate: args.localDate,
        sentAt: Date.now(),
        variantIndex: context.variantIndex,
      });
      return null;
    } catch (error) {
      await ctx.runMutation(retryReminderRef, args);
      throw error;
    }
  },
});

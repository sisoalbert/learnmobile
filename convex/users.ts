import { getAuthUserId } from '@convex-dev/auth/server';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { v } from 'convex/values';

import { mutation, query, httpAction, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { startUserDeletion } from './userDeletion';
import {
  addDateKeyDays,
  currentStreakLength,
  isValidTimezone,
  localDateKey,
  localTimeAt,
  longestStreakLength,
  nextStreakReminderAt,
} from './streakReminderTime';

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

    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect();
    const provider = accounts[0]?.provider;

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      age: user.age,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role ?? 'user',
      plan: user.plan ?? 'free',
      createdAt: user.createdAt ?? user._creationTime,
      lastActiveAt: user.lastActiveAt ?? user._creationTime,
      timezone: user.timezone,
      lastPracticeAt: user.lastPracticeAt,
      lastStreakEmailAt: user.lastStreakEmailAt,
      nextStreakEmailAt: user.nextStreakEmailAt,
      authProvider: provider === 'google' || provider === 'apple' ? provider : 'email',
      onboarding: user.onboarding,
    };
  },
});

export const syncPracticeReminderContext = mutation({
  args: { timezone: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('UNAUTHENTICATED');
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const timezone = args.timezone.trim();
    if (!isValidTimezone(timezone)) throw new Error('INVALID_TIMEZONE');
    const now = Date.now();
    let lastPracticeAt = user.lastPracticeAt;
    let currentDays = 0;

    if (user.timezone !== timezone || lastPracticeAt === undefined) {
      const completedAttempts = (await ctx.db
        .query('lessonAttempts')
        .withIndex('by_user_status_completed_at', (q) =>
          q.eq('userId', userId).eq('status', 'completed'))
        .collect())
        .filter((attempt) => attempt.completedAt !== undefined);
      const dateKeys = completedAttempts.map((attempt) =>
        localDateKey(attempt.completedAt!, timezone));
      const activityByDate = new Map<string, { lessonsCompleted: number; xpEarned: number }>();
      for (const attempt of completedAttempts) {
        const dateKey = localDateKey(attempt.completedAt!, timezone);
        const existing = activityByDate.get(dateKey) ?? { lessonsCompleted: 0, xpEarned: 0 };
        activityByDate.set(dateKey, {
          lessonsCompleted: existing.lessonsCompleted + 1,
          xpEarned: existing.xpEarned + attempt.xpEarned,
        });
      }

      const existingActivities = await ctx.db
        .query('dailyActivity')
        .withIndex('by_user_date', (q) => q.eq('userId', userId))
        .collect();
      for (const activity of existingActivities) await ctx.db.delete(activity._id);
      for (const [dateKey, activity] of activityByDate) {
        await ctx.db.insert('dailyActivity', {
          userId,
          dateKey,
          ...activity,
          updatedAt: now,
        });
      }

      lastPracticeAt = completedAttempts.reduce<number | undefined>(
        (latest, attempt) => latest === undefined
          ? attempt.completedAt
          : Math.max(latest, attempt.completedAt!),
        undefined,
      );
      const today = localDateKey(now, timezone);
      currentDays = currentStreakLength(dateKeys, today);
      const computedLongest = longestStreakLength(dateKeys);
      const streak = await ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique();
      const lastQualifiedDate = dateKeys.sort().at(-1);
      if (streak) {
        await ctx.db.patch(streak._id, {
          currentDays,
          longestDays: Math.max(streak.longestDays, computedLongest),
          lastQualifiedDate,
          updatedAt: now,
        });
      } else if (lastQualifiedDate) {
        await ctx.db.insert('streaks', {
          userId,
          currentDays,
          longestDays: computedLongest,
          lastQualifiedDate,
          updatedAt: now,
        });
      }
    } else {
      const streak = await ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique();
      currentDays = streak?.currentDays ?? 0;
    }

    let nextStreakEmailAt: number | undefined;
    if (
      user.onboarding?.reminderPreference === 'enabled'
      && user.email?.trim()
      && lastPracticeAt !== undefined
      && currentDays > 0
    ) {
      const today = localDateKey(now, timezone);
      nextStreakEmailAt = user.lastStreakEmailAt !== undefined
        && localDateKey(user.lastStreakEmailAt, timezone) === today
        ? localTimeAt(addDateKeyDays(today, 1), 19, timezone)
        : nextStreakReminderAt(lastPracticeAt, timezone, now);
    }

    await ctx.db.patch(userId, {
      timezone,
      lastPracticeAt,
      nextStreakEmailAt,
      streakEmailVariantIndex: user.streakEmailVariantIndex ?? 0,
    });
    return { timezone, lastPracticeAt: lastPracticeAt ?? null, nextStreakEmailAt: nextStreakEmailAt ?? null };
  },
});

export const updatePracticeReminders = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('UNAUTHENTICATED');
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    const now = Date.now();
    const onboarding = user.onboarding ?? {
      completed: false,
      motivations: [],
      savedAt: now,
    };

    let nextStreakEmailAt: number | undefined;
    if (
      args.enabled
      && user.email?.trim()
      && user.timezone
      && isValidTimezone(user.timezone)
      && user.lastPracticeAt !== undefined
    ) {
      const streak = await ctx.db
        .query('streaks')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique();
      if ((streak?.currentDays ?? 0) > 0) {
        const today = localDateKey(now, user.timezone);
        nextStreakEmailAt = user.lastStreakEmailAt !== undefined
          && localDateKey(user.lastStreakEmailAt, user.timezone) === today
          ? localTimeAt(addDateKeyDays(today, 1), 19, user.timezone)
          : nextStreakReminderAt(user.lastPracticeAt, user.timezone, now);
      }
    }

    await ctx.db.patch(userId, {
      onboarding: {
        ...onboarding,
        reminderPreference: args.enabled ? 'enabled' : 'disabled',
        savedAt: now,
      },
      nextStreakEmailAt,
    });
    return { enabled: args.enabled, nextStreakEmailAt: nextStreakEmailAt ?? null };
  },
});

export const updateProfile = mutation({
  args: {
    age: v.number(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    if (!Number.isInteger(args.age) || args.age < 1 || args.age > 120) {
      throw new Error('Invalid age');
    }

    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();
    if (!firstName || !lastName) throw new Error('Name is required');

    const baseUsername =
      firstName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'learner';
    const collisions = await ctx.db
      .query('users')
      .withIndex('normalizedUsername', (q) => q.eq('normalizedUsername', baseUsername))
      .collect();
    const username = collisions.some((candidate) => candidate._id !== userId)
      ? `${baseUsername}_${String(userId).slice(-5).toLowerCase()}`
      : baseUsername;

    await ctx.db.patch(userId, {
      age: args.age,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      username,
      normalizedUsername: username,
      plan: user.plan ?? 'free',
      createdAt: user.createdAt ?? user._creationTime,
      lastActiveAt: Date.now(),
    });

    return { username };
  },
});

export const deleteCurrent = mutation({
  args: {},
  returns: v.object({ deletionScheduled: v.boolean() }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    await startUserDeletion(ctx, user, {
      deletedByUserId: userId,
      reason: 'User requested self-deletion',
    });

    return { deletionScheduled: true };
  },
});

const DELETION_CONFIRMATION_TTL_MS = 30 * 60 * 1000;
const DELETION_RESEND_COOLDOWN_MS = 15 * 60 * 1000;
const DELETION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const DELETION_RATE_LIMIT_MAX = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashValue(value: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(value)));
}

function createDeletionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const saveAccountDeletionRequest = internalMutation({
  args: {
    email: v.string(),
    emailHash: v.string(),
    confirmationTokenHash: v.string(),
    confirmationUrl: v.string(),
    rateLimitIdentifierHash: v.string(),
  },
  returns: v.object({ accepted: v.boolean() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const rateLimit = await ctx.db
      .query('accountDeletionRateLimits')
      .withIndex('by_identifier', (q) => q.eq('identifierHash', args.rateLimitIdentifierHash))
      .unique();

    if (rateLimit && now - rateLimit.windowStartedAt < DELETION_RATE_LIMIT_WINDOW_MS) {
      if (rateLimit.requestCount >= DELETION_RATE_LIMIT_MAX) return { accepted: true };
      await ctx.db.patch(rateLimit._id, {
        requestCount: rateLimit.requestCount + 1,
        updatedAt: now,
      });
    } else if (rateLimit) {
      await ctx.db.patch(rateLimit._id, {
        windowStartedAt: now,
        requestCount: 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('accountDeletionRateLimits', {
        identifierHash: args.rateLimitIdentifierHash,
        windowStartedAt: now,
        requestCount: 1,
        updatedAt: now,
      });
    }

    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first();
    if (!user || user.deletionPendingAt) return { accepted: true };

    const verifiedRequest = await ctx.db
      .query('accountDeletionRequests')
      .withIndex('by_email_status', (q) => q.eq('email', args.email).eq('status', 'verified'))
      .first();
    if (verifiedRequest) return { accepted: true };

    const existingRequest = await ctx.db
      .query('accountDeletionRequests')
      .withIndex('by_email_status', (q) => q.eq('email', args.email).eq('status', 'pending_confirmation'))
      .first();
    if (existingRequest && now - existingRequest.updatedAt < DELETION_RESEND_COOLDOWN_MS) {
      return { accepted: true };
    }

    if (existingRequest) {
      await ctx.db.patch(existingRequest._id, {
        emailHash: args.emailHash,
        confirmationTokenHash: args.confirmationTokenHash,
        confirmationExpiresAt: now + DELETION_CONFIRMATION_TTL_MS,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('accountDeletionRequests', {
        email: args.email,
        emailHash: args.emailHash,
        status: 'pending_confirmation',
        confirmationTokenHash: args.confirmationTokenHash,
        confirmationExpiresAt: now + DELETION_CONFIRMATION_TTL_MS,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, internal.emails.sendAccountDeletionConfirmationEmail, {
      email: args.email,
      confirmationUrl: args.confirmationUrl,
    });
    return { accepted: true };
  },
});

export const confirmAccountDeletionRequest = internalMutation({
  args: { confirmationTokenHash: v.string() },
  returns: v.union(v.literal('confirmed'), v.literal('expired'), v.literal('invalid')),
  handler: async (ctx, { confirmationTokenHash }) => {
    const request = await ctx.db
      .query('accountDeletionRequests')
      .withIndex('by_confirmation_token', (q) => q.eq('confirmationTokenHash', confirmationTokenHash))
      .first();
    if (!request || request.status !== 'pending_confirmation' || !request.email) return 'invalid';

    const now = Date.now();
    if (!request.confirmationExpiresAt || request.confirmationExpiresAt < now) {
      await ctx.db.patch(request._id, {
        confirmationTokenHash: undefined,
        confirmationExpiresAt: undefined,
        status: 'rejected',
        updatedAt: now,
      });
      return 'expired';
    }

    await ctx.db.patch(request._id, {
      confirmationTokenHash: undefined,
      confirmationExpiresAt: undefined,
      status: 'verified',
      verifiedAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendVerifiedAccountDeletionEmail, {
      email: request.email,
    });
    return 'confirmed';
  },
});

export const requestAccountDeletion = httpAction(async (ctx, request) => {
  const method = request.method;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers });
  }

  try {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 2048) {
      return new Response('Payload Too Large', { status: 413, headers });
    }
    const data = await request.json();
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return new Response('Bad Request: Valid email is required', { status: 400, headers });
    }

    const confirmationToken = createDeletionToken();
    const origin = new URL(request.url).origin;
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const clientIdentifier = request.headers.get('cf-connecting-ip') ?? forwardedFor ?? `email:${email}`;
    await ctx.runMutation(internal.users.saveAccountDeletionRequest, {
      email,
      emailHash: hashValue(email),
      confirmationTokenHash: hashValue(confirmationToken),
      confirmationUrl: `${origin}/confirm-account-deletion?token=${confirmationToken}`,
      rateLimitIdentifierHash: hashValue(clientIdentifier),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500, headers });
  }
});

export const confirmAccountDeletion = httpAction(async (ctx, request) => {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const result = /^[a-f0-9]{64}$/.test(token)
    ? await ctx.runMutation(internal.users.confirmAccountDeletionRequest, {
      confirmationTokenHash: hashValue(token),
    })
    : 'invalid';
  const confirmed = result === 'confirmed';
  const title = confirmed ? 'Deletion request confirmed' : 'Confirmation link unavailable';
  const message = confirmed
    ? 'Your verified request has been sent to the Learn Expo support team.'
    : result === 'expired'
      ? 'This confirmation link has expired. Submit a new request from Learn Expo.'
      : 'This confirmation link is invalid or has already been used.';

  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;background:#f7f9fc;color:#17213b;margin:0;display:grid;min-height:100vh;place-items:center"><main style="max-width:520px;margin:24px;padding:32px;border:1px solid #e2e8f0;border-radius:20px;background:white;box-shadow:0 12px 32px rgba(23,33,59,.08)"><h1>${title}</h1><p style="line-height:1.6;color:#526078">${message}</p><a href="https://learnexpo.online" style="color:#1899d6;font-weight:700">Return to Learn Expo</a></main></body></html>`,
    { status: confirmed ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
});

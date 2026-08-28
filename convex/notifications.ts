import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import { makeFunctionReference } from 'convex/server';
import type { Id } from './_generated/dataModel';
import { streakReminderTemplate } from './streakReminderContent';
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';

const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const MAX_FETCH_ATTEMPTS = 3;

const getStreakReminderPushContextRef = makeFunctionReference<
  'query',
  { userId: Id<'users'>; localDate: string },
  { localDate: string; streakDays: number; freezeDay: 1 | 2 | 3; devices: { deviceId: Id<'devices'>; expoPushToken: string }[] } | null
>('streakReminders:getStreakReminderPushContext');
const finalizeStreakPushReminderRef = makeFunctionReference<
  'mutation',
  { userId: Id<'users'>; localDate: string; sentAt: number },
  null
>('streakReminders:finalizeStreakPushReminder');
const retryStreakPushReminderRef = makeFunctionReference<
  'mutation',
  { userId: Id<'users'>; localDate: string },
  null
>('streakReminders:retryStreakPushReminder');
const reconcileStreakReminderRef = makeFunctionReference<
  'mutation',
  { userId: Id<'users'> },
  null
>('streakReminders:reconcileStreakReminder');

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushReceipt = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

const isExpoPushToken = (value: string) =>
  /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(value);

const isInstallationId = (value: string) =>
  value.length >= 16 && value.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(value);

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function postToExpo(url: string, body: unknown, accessToken: string) {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) return await response.json() as unknown;

      const responseBody = (await response.text()).slice(0, 500);
      const error = new Error(`Expo Push API returned HTTP ${response.status}: ${responseBody}`);
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < MAX_FETCH_ATTEMPTS - 1) {
      await delay(1000 * (2 ** attempt));
    }
  }

  throw lastError ?? new Error('Expo Push API request failed');
}

function requireAccessToken() {
  const accessToken = process.env.EXPO_PUSH_ACCESS_TOKEN;
  if (!accessToken) throw new Error('EXPO_PUSH_ACCESS_TOKEN is not configured');
  return accessToken;
}

function ticketError(ticket: ExpoPushTicket | ExpoPushReceipt) {
  const code = ticket.details?.error;
  const message = ticket.message ?? 'Expo Push API returned an unknown error';
  return code ? `${code}: ${message}` : message;
}

export const registerDevice = mutation({
  args: {
    installationId: v.string(),
    expoPushToken: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
    allowReenable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('UNAUTHENTICATED');
    if (!isInstallationId(args.installationId)) throw new Error('INVALID_INSTALLATION_ID');
    if (!isExpoPushToken(args.expoPushToken)) throw new Error('INVALID_EXPO_PUSH_TOKEN');

    const timestamp = Date.now();
    const [existingInstallation, existingToken] = await Promise.all([
      ctx.db
        .query('devices')
        .withIndex('by_installation', (q) => q.eq('installationId', args.installationId))
        .unique(),
      ctx.db
        .query('devices')
        .withIndex('by_push_token', (q) => q.eq('expoPushToken', args.expoPushToken))
        .unique(),
    ]);

    if (existingToken && existingToken._id !== existingInstallation?._id) {
      await ctx.db.patch(existingToken._id, {
        expoPushToken: undefined,
        pushEnabled: false,
        updatedAt: timestamp,
        disabledAt: timestamp,
      });
    }

    if (existingInstallation) {
      if (existingInstallation.removedAt !== undefined && !args.allowReenable) {
        return existingInstallation._id;
      }
      await ctx.db.patch(existingInstallation._id, {
        userId,
        platform: args.platform,
        expoPushToken: args.expoPushToken,
        pushEnabled: true,
        updatedAt: timestamp,
        lastSeenAt: timestamp,
        disabledAt: undefined,
        removedAt: undefined,
      });
      return existingInstallation._id;
    }

    return ctx.db.insert('devices', {
      userId,
      installationId: args.installationId,
      expoPushToken: args.expoPushToken,
      platform: args.platform,
      pushEnabled: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp,
    });
  },
});

export const disableDevice = mutation({
  args: { installationId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('UNAUTHENTICATED');
    if (!isInstallationId(args.installationId)) throw new Error('INVALID_INSTALLATION_ID');
    const existing = await ctx.db
      .query('devices')
      .withIndex('by_installation', (q) => q.eq('installationId', args.installationId))
      .unique();
    if (!existing || existing.userId !== userId) return null;

    const timestamp = Date.now();
    await ctx.db.patch(existing._id, {
      pushEnabled: false,
      updatedAt: timestamp,
      disabledAt: timestamp,
    });
    return existing._id;
  },
});

export const currentDevices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const devices = await ctx.db
      .query('devices')
      .withIndex('by_user_push_enabled', (q) => q.eq('userId', userId).eq('pushEnabled', true))
      .collect();

    return devices.flatMap((device) => device.expoPushToken ? [{
      deviceId: device._id,
      platform: device.platform,
      expoPushToken: device.expoPushToken,
    }] : []);
  },
});

export const listDevices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const devices = await ctx.db
      .query('devices')
      .withIndex('by_user_push_enabled', (q) => q.eq('userId', userId).eq('pushEnabled', true))
      .collect();

    // Never expose push tokens to the client; the device id is only used for the
    // authenticated removal mutation below.
    return devices
      .filter((device) => device.expoPushToken)
      .map((device) => ({
        id: device._id,
        platform: device.platform,
        createdAt: device.createdAt,
        lastSeenAt: device.lastSeenAt ?? device.updatedAt,
      }))
      .sort((first, second) => second.lastSeenAt - first.lastSeenAt);
  },
});

export const removeDevice = mutation({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('UNAUTHENTICATED');

    const device = await ctx.db.get(args.deviceId);
    if (!device || device.userId !== userId) throw new Error('DEVICE_NOT_FOUND');

    const timestamp = Date.now();
    await ctx.db.patch(device._id, {
      expoPushToken: undefined,
      pushEnabled: false,
      updatedAt: timestamp,
      disabledAt: timestamp,
      removedAt: timestamp,
    });
    return null;
  },
});

export const getLessonNotificationContext = internalQuery({
  args: {
    userId: v.id('users'),
    attemptId: v.id('lessonAttempts'),
  },
  handler: async (ctx, args) => {
    const [user, attempt] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.get(args.attemptId),
    ]);
    if (
      !user
      || user.onboarding?.reminderPreference === 'disabled'
      || !attempt
      || attempt.userId !== args.userId
      || attempt.status !== 'completed'
    ) return null;

    const lesson = await ctx.db.get(attempt.lessonId);
    if (!lesson) return null;
    const devices = await ctx.db
      .query('devices')
      .withIndex('by_user_push_enabled', (q) => q.eq('userId', args.userId).eq('pushEnabled', true))
      .collect();

    return {
      lessonTitle: lesson.title,
      xpEarned: attempt.xpEarned,
      devices: devices.flatMap((device) => device.expoPushToken ? [{
        deviceId: device._id,
        expoPushToken: device.expoPushToken,
      }] : []),
    };
  },
});

const ticketResultValidator = v.object({
  deviceId: v.id('devices'),
  ticketId: v.optional(v.string()),
  error: v.optional(v.string()),
});

export const recordPushTickets = internalMutation({
  args: {
    userId: v.id('users'),
    attemptId: v.id('lessonAttempts'),
    results: v.array(ticketResultValidator),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const ticketed: { deliveryId: Id<'pushNotificationDeliveries'>; ticketId: string }[] = [];

    for (const result of args.results) {
      const deliveryId = await ctx.db.insert('pushNotificationDeliveries', {
        userId: args.userId,
        lessonAttemptId: args.attemptId,
        deviceId: result.deviceId,
        ...(result.ticketId ? { ticketId: result.ticketId } : {}),
        status: result.ticketId ? 'ticketed' : 'failed',
        ...(result.error ? { error: result.error } : {}),
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (result.ticketId) ticketed.push({ deliveryId, ticketId: result.ticketId });
      if (result.error?.startsWith('DeviceNotRegistered:')) {
        await ctx.db.patch(result.deviceId, {
          pushEnabled: false,
          updatedAt: timestamp,
          disabledAt: timestamp,
        });
      }
    }

    if (ticketed.length > 0) {
      await ctx.scheduler.runAfter(
        RECEIPT_DELAY_MS,
        internal.notifications.checkPushReceipts,
        { deliveries: ticketed },
      );
    }

    return ticketed;
  },
});

export const recordSendFailure = internalMutation({
  args: {
    userId: v.id('users'),
    attemptId: v.id('lessonAttempts'),
    devices: v.array(v.object({
      deviceId: v.id('devices'),
    })),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    for (const device of args.devices) {
      await ctx.db.insert('pushNotificationDeliveries', {
        userId: args.userId,
        lessonAttemptId: args.attemptId,
        deviceId: device.deviceId,
        status: 'failed',
        error: args.error,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  },
});

export const recordStreakReminderPushTickets = internalMutation({
  args: {
    userId: v.id('users'),
    localDate: v.string(),
    results: v.array(ticketResultValidator),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const ticketed: { deliveryId: Id<'pushNotificationDeliveries'>; ticketId: string }[] = [];
    for (const result of args.results) {
      const deliveryId = await ctx.db.insert('pushNotificationDeliveries', {
        userId: args.userId,
        deviceId: result.deviceId,
        type: 'streak_reminder',
        reminderDate: args.localDate,
        ...(result.ticketId ? { ticketId: result.ticketId } : {}),
        status: result.ticketId ? 'ticketed' : 'failed',
        ...(result.error ? { error: result.error } : {}),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (result.ticketId) ticketed.push({ deliveryId, ticketId: result.ticketId });
      if (result.error?.startsWith('DeviceNotRegistered:')) {
        await ctx.db.patch(result.deviceId, { pushEnabled: false, updatedAt: timestamp, disabledAt: timestamp });
      }
    }
    if (ticketed.length > 0) {
      await ctx.scheduler.runAfter(RECEIPT_DELAY_MS, internal.notifications.checkPushReceipts, { deliveries: ticketed });
    }
    return ticketed;
  },
});

export const recordStreakReminderPushFailure = internalMutation({
  args: {
    userId: v.id('users'),
    localDate: v.string(),
    devices: v.array(v.object({ deviceId: v.id('devices') })),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    for (const device of args.devices) {
      await ctx.db.insert('pushNotificationDeliveries', {
        userId: args.userId,
        deviceId: device.deviceId,
        type: 'streak_reminder',
        reminderDate: args.localDate,
        status: 'failed',
        error: args.error,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  },
});

export const recordPushReceipts = internalMutation({
  args: {
    results: v.array(v.object({
      deliveryId: v.id('pushNotificationDeliveries'),
      accepted: v.boolean(),
      error: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    for (const result of args.results) {
      const delivery = await ctx.db.get(result.deliveryId);
      if (!delivery || delivery.status !== 'ticketed') continue;
      await ctx.db.patch(delivery._id, {
        status: result.accepted ? 'provider_accepted' : 'failed',
        ...(result.error ? { error: result.error } : {}),
        updatedAt: timestamp,
      });
      if (result.error?.startsWith('DeviceNotRegistered:')) {
        await ctx.db.patch(delivery.deviceId, {
          pushEnabled: false,
          updatedAt: timestamp,
          disabledAt: timestamp,
        });
      }
    }
  },
});

export const sendLessonCompleted = internalAction({
  args: {
    userId: v.id('users'),
    attemptId: v.id('lessonAttempts'),
  },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(internal.notifications.getLessonNotificationContext, args);
    if (!context || context.devices.length === 0) return null;

    let responseData: unknown;
    try {
      const response = await postToExpo(
        EXPO_PUSH_SEND_URL,
        context.devices.map((device) => ({
          to: device.expoPushToken,
          sound: 'default',
          channelId: 'learning',
          title: 'Lesson complete 🎉',
          body: `${context.lessonTitle} complete — you earned ${context.xpEarned} XP.`,
          data: {
            type: 'lessonCompleted',
            attemptId: String(args.attemptId),
            url: '/home',
          },
        })),
        requireAccessToken(),
      );
      responseData = (response as { data?: unknown })?.data;
    } catch (error) {
      await ctx.runMutation(internal.notifications.recordSendFailure, {
        ...args,
        devices: context.devices.map(({ deviceId }) => ({ deviceId })),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const tickets = Array.isArray(responseData) ? responseData : [responseData];
    const results = context.devices.map((device, index) => {
      const ticket = tickets[index] as ExpoPushTicket | undefined;
      if (ticket?.status === 'ok' && ticket.id) {
        return { deviceId: device.deviceId, ticketId: ticket.id };
      }
      return {
        deviceId: device.deviceId,
        error: ticket ? ticketError(ticket) : 'Expo Push API did not return a ticket',
      };
    });
    await ctx.runMutation(internal.notifications.recordPushTickets, {
      ...args,
      results,
    });
    return null;
  },
});

export const sendStreakReminderPush = internalAction({
  args: { userId: v.id('users'), localDate: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(getStreakReminderPushContextRef, args);
    if (!context) {
      await ctx.runMutation(reconcileStreakReminderRef, { userId: args.userId });
      return null;
    }
    if (context.devices.length === 0) {
      await ctx.runMutation(finalizeStreakPushReminderRef, { ...args, sentAt: Date.now() });
      return null;
    }

    const template = streakReminderTemplate(context.freezeDay);
    let responseData: unknown;
    try {
      const response = await postToExpo(
        EXPO_PUSH_SEND_URL,
        context.devices.map((device) => ({
          to: device.expoPushToken,
          sound: 'default',
          channelId: 'learning',
          title: template.subject,
          body: template.body,
          data: { type: 'streakReminder', url: '/home' },
        })),
        requireAccessToken(),
      );
      responseData = (response as { data?: unknown })?.data;
    } catch (error) {
      await ctx.runMutation(internal.notifications.recordStreakReminderPushFailure, {
        ...args,
        devices: context.devices.map(({ deviceId }) => ({ deviceId })),
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.runMutation(retryStreakPushReminderRef, args);
      throw error;
    }

    const tickets = Array.isArray(responseData) ? responseData : [responseData];
    const results = context.devices.map((device, index) => {
      const ticket = tickets[index] as ExpoPushTicket | undefined;
      return ticket?.status === 'ok' && ticket.id
        ? { deviceId: device.deviceId, ticketId: ticket.id }
        : { deviceId: device.deviceId, error: ticket ? ticketError(ticket) : 'Expo Push API did not return a ticket' };
    });
    await ctx.runMutation(internal.notifications.recordStreakReminderPushTickets, { ...args, results });
    await ctx.runMutation(finalizeStreakPushReminderRef, { ...args, sentAt: Date.now() });
    return null;
  },
});

export const checkPushReceipts = internalAction({
  args: {
    deliveries: v.array(v.object({
      deliveryId: v.id('pushNotificationDeliveries'),
      ticketId: v.string(),
    })),
  },
  handler: async (ctx, args): Promise<null> => {
    let responseData: unknown;
    try {
      const response = await postToExpo(
        EXPO_PUSH_RECEIPTS_URL,
        { ids: args.deliveries.map((delivery) => delivery.ticketId) },
        requireAccessToken(),
      );
      responseData = (response as { data?: unknown })?.data;
    } catch (error) {
      await ctx.runMutation(internal.notifications.recordPushReceipts, {
        results: args.deliveries.map((delivery) => ({
          deliveryId: delivery.deliveryId,
          accepted: false,
          error: error instanceof Error ? error.message : String(error),
        })),
      });
      throw error;
    }

    const receipts = responseData && typeof responseData === 'object'
      ? responseData as Record<string, ExpoPushReceipt>
      : {};
    await ctx.runMutation(internal.notifications.recordPushReceipts, {
      results: args.deliveries.map((delivery) => {
        const receipt = receipts[delivery.ticketId];
        if (receipt?.status === 'ok') {
          return { deliveryId: delivery.deliveryId, accepted: true };
        }
        return {
          deliveryId: delivery.deliveryId,
          accepted: false,
          error: receipt ? ticketError(receipt) : 'Push receipt was not available',
        };
      }),
    });
    return null;
  },
});

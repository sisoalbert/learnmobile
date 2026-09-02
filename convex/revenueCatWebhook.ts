import { httpAction } from './_generated/server';
import { revenueCatSyncSubscriberRef } from './revenueCat';

const ENTITLEMENT_IDENTIFIER = 'Learn Expo Pro';
const REVENUECAT_SUBSCRIBER_ENDPOINT = 'https://api.revenuecat.com/v1/subscribers/';
const MAX_WEBHOOK_BODY_BYTES = 128 * 1024;
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function hexFromBytes(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function secureStringEquals(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function signatureParts(header: string) {
  const values = Object.fromEntries(
    header.split(',').map((part) => {
      const separator = part.indexOf('=');
      return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }),
  );
  return { timestamp: values.t, signature: values.v1 };
}

async function hasValidWebhookSignature(rawBody: Uint8Array, header: string, secret: string) {
  const { signature, timestamp } = signatureParts(header);
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const prefix = encoder.encode(`${timestamp}.`);
  const signedPayload = new Uint8Array(prefix.length + rawBody.length);
  signedPayload.set(prefix);
  signedPayload.set(rawBody, prefix.length);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  const computedSignature = hexFromBytes(new Uint8Array(await crypto.subtle.sign('HMAC', key, signedPayload)));
  return secureStringEquals(computedSignature, signature);
}

function currentSubscriberSnapshot(payload: unknown, event: JsonRecord) {
  const subscriber = isRecord(payload) && isRecord(payload.subscriber) ? payload.subscriber : undefined;
  const entitlements = subscriber && isRecord(subscriber.entitlements) ? subscriber.entitlements : undefined;
  const entitlement = entitlements && isRecord(entitlements[ENTITLEMENT_IDENTIFIER])
    ? entitlements[ENTITLEMENT_IDENTIFIER]
    : undefined;
  const expiresAt = parseTimestamp(entitlement?.expires_date);
  const hasPro = entitlement !== undefined && (expiresAt === undefined || expiresAt > Date.now());
  const productId = stringValue(entitlement?.product_identifier)
    ?? stringValue(event.product_id)
    ?? 'unknown';
  const subscriptions = subscriber && isRecord(subscriber.subscriptions) ? subscriber.subscriptions : undefined;
  const subscription = subscriptions && isRecord(subscriptions[productId]) ? subscriptions[productId] : undefined;

  return {
    externalSubscriptionId: stringValue(subscription?.original_transaction_id)
      ?? stringValue(event.original_transaction_id),
    hasPro,
    isTrial: subscription?.period_type === 'trial',
    periodEndsAt: expiresAt,
    productId,
  };
}

export const handleRevenueCatWebhook = httpAction(async (ctx, request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Convex 1.43 exposes deployment environment variables through process.env.
  // These variables stay server-only and are never bundled into Expo.
  const authorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;
  const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
  const revenueCatSecretApiKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!authorization || !signingSecret || !revenueCatSecretApiKey) {
    return new Response('RevenueCat webhook is not configured', { status: 503 });
  }
  if (request.headers.get('authorization') !== authorization) {
    return new Response('Unauthorized', { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) return new Response('Payload Too Large', { status: 413 });

  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (rawBody.length > MAX_WEBHOOK_BODY_BYTES) return new Response('Payload Too Large', { status: 413 });
  const signatureHeader = request.headers.get('x-revenuecat-webhook-signature');
  if (!signatureHeader || !await hasValidWebhookSignature(rawBody, signatureHeader, signingSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!isRecord(payload) || !isRecord(payload.event)) return new Response('Bad Request', { status: 400 });

  const event = payload.event;
  const appUserId = stringValue(event.app_user_id);
  const eventId = stringValue(event.id);
  const eventType = stringValue(event.type);
  const eventTimestamp = typeof event.event_timestamp_ms === 'number' && Number.isFinite(event.event_timestamp_ms)
    ? event.event_timestamp_ms
    : undefined;
  if (!appUserId || !eventId || !eventType || eventTimestamp === undefined) {
    return new Response('Bad Request', { status: 400 });
  }
  if (eventType === 'TEST') return new Response(null, { status: 200 });

  let subscriberResponse: Response;
  try {
    subscriberResponse = await fetch(`${REVENUECAT_SUBSCRIBER_ENDPOINT}${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${revenueCatSecretApiKey}` },
    });
  } catch {
    return new Response('RevenueCat unavailable', { status: 502 });
  }
  if (!subscriberResponse.ok) return new Response('RevenueCat unavailable', { status: 502 });

  let subscriber: unknown;
  try {
    subscriber = await subscriberResponse.json();
  } catch {
    return new Response('RevenueCat returned invalid data', { status: 502 });
  }

  const snapshot = currentSubscriberSnapshot(subscriber, event);
  await ctx.runMutation(revenueCatSyncSubscriberRef, {
    appUserId,
    eventId,
    eventTimestamp,
    ...snapshot,
  });
  return new Response(null, { status: 200 });
});

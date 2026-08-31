const mockRunMutation = jest.fn();
const mockFetch = jest.fn();

jest.mock('../../convex/_generated/server', () => ({
  httpAction: (handler: unknown) => handler,
}));

jest.mock('../../convex/revenueCat', () => ({
  revenueCatSyncSubscriberRef: 'revenueCat:syncSubscriber',
}));

import { handleRevenueCatWebhook } from '../../convex/revenueCatWebhook';

type WebhookHandler = (context: { runMutation: jest.Mock }, request: Request) => Promise<Response>;

const handler = handleRevenueCatWebhook as unknown as WebhookHandler;
const encoder = new TextEncoder();

async function signedRequest(
  event: Record<string, unknown>,
  options: { authorization?: string; signatureSecret?: string } = {},
) {
  const body = JSON.stringify({ event });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const secret = options.signatureSecret ?? 'signing-secret';
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { hash: 'SHA-256', name: 'HMAC' }, false, ['sign']);
  const signature = Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');

  return new Request('https://example.test/revenuecat/webhook', {
    body,
    headers: {
      authorization: options.authorization ?? 'webhook-authorization',
      'content-type': 'application/json',
      'x-revenuecat-webhook-signature': `t=${timestamp},v1=${signature}`,
    },
    method: 'POST',
  });
}

function subscriberResponse(expiresDate: string | null) {
  return new Response(JSON.stringify({
    subscriber: {
      entitlements: expiresDate === null ? {} : {
        learn_expo_pro: {
          expires_date: expiresDate,
          product_identifier: 'monthly',
        },
      },
      subscriptions: {
        monthly: {
          original_transaction_id: 'transaction-id',
          period_type: 'normal',
        },
      },
    },
  }), { status: 200 });
}

describe('RevenueCat webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REVENUECAT_SECRET_API_KEY = 'secret-api-key';
    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION = 'webhook-authorization';
    process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET = 'signing-secret';
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue(subscriberResponse(new Date(Date.now() + 60_000).toISOString()));
    mockRunMutation.mockResolvedValue({ outcome: 'synced' });
  });

  it('accepts a valid signed event and reconciles the active entitlement', async () => {
    const response = await handler(
      { runMutation: mockRunMutation },
      await signedRequest({ app_user_id: 'user-id', event_timestamp_ms: Date.now(), id: 'event-id', type: 'INITIAL_PURCHASE' }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v1/subscribers/user-id',
      { headers: { Authorization: 'Bearer secret-api-key' } },
    );
    expect(mockRunMutation).toHaveBeenCalledWith('revenueCat:syncSubscriber', expect.objectContaining({
      appUserId: 'user-id',
      eventId: 'event-id',
      hasPro: true,
      productId: 'monthly',
    }));
  });

  it('rejects missing authorization or an invalid HMAC before calling RevenueCat', async () => {
    const unauthorized = await handler(
      { runMutation: mockRunMutation },
      await signedRequest({ app_user_id: 'user-id', event_timestamp_ms: Date.now(), id: 'event-id', type: 'RENEWAL' }, { authorization: 'wrong' }),
    );
    const invalidSignature = await handler(
      { runMutation: mockRunMutation },
      await signedRequest({ app_user_id: 'user-id', event_timestamp_ms: Date.now(), id: 'event-id', type: 'RENEWAL' }, { signatureSecret: 'wrong' }),
    );

    expect(unauthorized.status).toBe(401);
    expect(invalidSignature.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('keeps access after cancellation until the subscriber record expires', async () => {
    const cancellation = await signedRequest({ app_user_id: 'user-id', event_timestamp_ms: Date.now(), id: 'cancellation', type: 'CANCELLATION' });
    await handler({ runMutation: mockRunMutation }, cancellation);
    expect(mockRunMutation.mock.calls[0][1]).toEqual(expect.objectContaining({ hasPro: true }));

    mockFetch.mockResolvedValueOnce(subscriberResponse(new Date(Date.now() - 60_000).toISOString()));
    const expiration = await signedRequest({ app_user_id: 'user-id', event_timestamp_ms: Date.now(), id: 'expiration', type: 'EXPIRATION' });
    await handler({ runMutation: mockRunMutation }, expiration);
    expect(mockRunMutation.mock.calls[1][1]).toEqual(expect.objectContaining({ hasPro: false }));
  });

  it('hands repeat event IDs to the idempotent Convex mutation without duplicating client work', async () => {
    mockRunMutation.mockResolvedValue({ outcome: 'duplicate' });
    const request = await signedRequest({ app_user_id: 'user-id', event_timestamp_ms: Date.now(), id: 'replayed-event', type: 'RENEWAL' });
    const response = await handler({ runMutation: mockRunMutation }, request);

    expect(response.status).toBe(200);
    expect(mockRunMutation).toHaveBeenCalledWith('revenueCat:syncSubscriber', expect.objectContaining({ eventId: 'replayed-event' }));
  });
});

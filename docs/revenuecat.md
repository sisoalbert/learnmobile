# RevenueCat Test Store

This app uses RevenueCat only on native iOS and Android builds. The React Native SDK is configured after a user signs in, with the opaque Convex user document ID as the RevenueCat App User ID. Expo web deliberately does not open a native paywall.

## Local development build

Set the Test Store public SDK key in the untracked `.env.development.local` file:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=test_EgqOhdBtGdSYcrJqVUDNnIjNZCh
```

Then regenerate native projects and run a development build. RevenueCat native purchases and paywalls do not work in Expo Go.

```bash
npm run cleani
npm run ios
```

Use `npm run cleana` and `npm run android` for Android. Never ship this Test Store key to App Store or Google Play production builds; replace it with the platform-specific public SDK keys first.

## RevenueCat dashboard

In the RevenueCat Test Store, create these products:

| Product ID | Type | Price |
| --- | --- | --- |
| `lifetime` | One-time / lifetime | $99.99 |
| `yearly` | Annual subscription | $59.99 |
| `monthly` | Monthly subscription | $9.99 |

Create entitlement `learn_expo_pro` with display name **Learn Expo Pro** and attach all three products. Create the current `default` offering with its Lifetime, Annual, and Monthly packages mapped to those product IDs. Build and publish a RevenueCat Paywall for that offering. The app intentionally receives product copy, pricing, eligibility, and purchase options from that remote paywall rather than hard-coding them.

Configure Customer Center in the RevenueCat dashboard too. It is shown to entitled native users as **Manage subscription**; if the account plan does not support Customer Center or configuration is unavailable, the app shows an actionable error instead.

The planned seven-day annual trial belongs in App Store Connect and Google Play when the app moves to live stores. Test Store supports simulated purchase, failure, cancellation, renewal, expiry, and restore flows but does not replace real-store introductory-offer configuration.

## Convex webhook sync

Register this URL in RevenueCat Dashboard → Integrations → Webhooks:

```text
https://<your-convex-site>.convex.site/revenuecat/webhook
```

Enable both an Authorization header and HMAC webhook signing. Configure the same values as server-side Convex environment variables (never Expo variables):

```bash
npx convex env set REVENUECAT_WEBHOOK_AUTHORIZATION '<exact Authorization header value>'
npx convex env set REVENUECAT_WEBHOOK_SIGNING_SECRET '<RevenueCat HMAC signing secret>'
npx convex env set REVENUECAT_SECRET_API_KEY '<RevenueCat secret API key>'
```

The webhook checks the Authorization header, validates the HMAC over the original request bytes and a five-minute timestamp, stores event IDs to make delivery idempotent, then fetches the authoritative RevenueCat subscriber record. It records a `revenuecat` subscription and changes `users.plan` to `premium` only while `learn_expo_pro` is currently active. A cancellation continues to grant access until the actual expiry; only a current inactive entitlement revokes it.

On the first free-to-Pro transition, the webhook schedules a Learn Expo Pro welcome email using the existing Resend integration. Ensure `RESEND_API_KEY` is configured in Convex; optionally set `PREMIUM_EMAIL_FROM` to a verified sender. The existing `RESEND_TEST_RECIPIENT` environment value is respected in development. Renewals, restores, repeated webhook deliveries, and cancellation events do not send another welcome email.

## Validation checklist

1. Build and launch the native development client.
2. Sign in, open Pro, and confirm the dashboard-managed paywall appears.
3. Exercise Test Store success, failure, cancellation, restore, renewal, expiry, sign-out, and account-switching flows.
4. Send a signed test webhook from RevenueCat and verify the user and subscription records in Convex.
5. Confirm that an active client CustomerInfo entitlement immediately hides ads and premium gates before the webhook round trip completes.

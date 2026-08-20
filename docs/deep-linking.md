# Deep Linking Runbook (iOS Universal Links & Android App Links)

This guide documents how deep linking is configured, deployed, and tested in **Learn Expo** for both iOS and Android.

---

## 1. Deep Linking Architecture Overview

Learn Expo supports two types of deep linking:

1. **Custom URL Schemes (`learn://`)**:
   - Opens the application directly on device without domain verification.
   - Useful for internal redirection, OAuth callbacks, and local testing.
2. **Universal Links (iOS) & Android App Links (Android) (`https://learnexpo.online/...`)**:
   - Standard HTTPS URLs that open directly in the app without showing browser prompts or disambiguation dialogs.
   - Requires hosting verification files on the public domain (`https://learnexpo.online/.well-known/`).

### App Identifiers & Domain

| Platform | Property | Value |
|---|---|---|
| **Domain** | Primary Host | `learnexpo.online` |
| **Custom Scheme**| Scheme | `learn` |
| **iOS** | Bundle Identifier | `com.questerstudios.learn` |
| **iOS** | Apple Team ID | `NSZ2XHYDC7` |
| **iOS** | App ID | `NSZ2XHYDC7.com.questerstudios.learn` |
| **Android** | Package Name | `com.questerstudios.learn` |

---

## 2. iOS Configuration (Universal Links)

### App Configuration (`app.config.ts`)

In `app.config.ts`, iOS is configured with associated domains and custom scheme:

```ts
export default {
  expo: {
    scheme: 'learn',
    ios: {
      bundleIdentifier: 'com.questerstudios.learn',
      associatedDomains: ['applinks:learnexpo.online'],
    },
  },
};
```

### Apple App Site Association File (`public/.well-known/apple-app-site-association`)

Hosted at `https://learnexpo.online/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "NSZ2XHYDC7.com.questerstudios.learn",
        "paths": ["/home"]
      }
    ]
  }
}
```

> [!NOTE]
> Apple caches the `apple-app-site-association` file on Apple CDN servers. Changes made to this file on your domain may take up to 24-48 hours to be reflected on physical iOS devices unless testing in development mode.

---

## 3. Android Configuration (Android App Links)

### App Configuration (`app.config.ts`)

In `app.config.ts`, Android requires an `intentFilters` definition with `autoVerify: true`:

```ts
export default {
  expo: {
    scheme: 'learn',
    android: {
      package: 'com.questerstudios.learn',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'learnexpo.online',
              pathPrefix: '/home',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  },
};
```

### Digital Asset Links File (`public/.well-known/assetlinks.json`)

Hosted at `https://learnexpo.online/.well-known/assetlinks.json`.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.questerstudios.learn",
      "sha256_cert_fingerprints": [
        "A2:A4:9A:BB:58:3B:DE:10:86:AA:58:64:74:2D:99:5E:C7:EA:71:77:2C:89:A1:A9:1C:A2:A0:5A:8D:1C:31:15",
        "3B:81:DE:A5:94:72:82:9F:3E:72:20:20:8C:F5:31:DF:25:42:6B:55:26:27:12:64:8E:76:D5:C3:F0:5D:68:5B"
      ]
    }
  }
]
```

### Understanding Android SHA-256 Fingerprints

> [!IMPORTANT]
> Android OS validates that the certificate signing the installed APK/AAB matches one of the fingerprints in `assetlinks.json`.

1. **Google Play App Signing Key (`A2:A4:...`)**:
   - Used when users download the app from Google Play Store tracks (Production, Closed, Internal testing).
   - Found in **Google Play Console** → **Setup** → **App integrity** → **App signing** → **App signing key certificate**.
2. **Upload Key Certificate (`3B:81:...`)**:
   - Used by EAS Build or local machines to sign standalone preview APKs or AABs before Google re-signs them.
   - Found in `npx eas credentials` → **Android** → **Keystore** → **SHA-256 Fingerprint**.

Both fingerprints are listed in `assetlinks.json` so that internal/preview APKs and production Play Store builds both pass domain verification.

---

## 4. Web Hosting & Headers Configuration

Both `.well-known` files reside in the `public/` directory and are exported into `dist/` when building for web.

### Cloudflare Headers (`public/_headers`)

Cloudflare Workers / Pages requires serving `.well-known` files with `Content-Type: application/json` without HTTP redirects:

```http
/.well-known/apple-app-site-association
  Content-Type: application/json

/.well-known/assetlinks.json
  Content-Type: application/json
```

### Deploying Verification Files

Whenever `assetlinks.json` or `apple-app-site-association` is updated:

```bash
npm run deploy:web
```

### Validating Domain Verification Files Online

- **Google Digital Asset Links API Validation**:
  ```bash
  curl "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://learnexpo.online&relation=delegate_permission/common.handle_all_urls"
  ```
- **Direct HTTP Check**:
  ```bash
  curl -I https://learnexpo.online/.well-known/assetlinks.json
  curl -I https://learnexpo.online/.well-known/apple-app-site-association
  ```

---

## 5. Testing & Verification Guide

### Testing on iOS

#### A. Custom Scheme (`learn://`)
```bash
# Via Simulator
xcrun simctl openurl booted "learn://home"

# Via URI Scheme CLI
npx uri-scheme open "learn://home" --ios
```

#### B. Universal Links (`https://learnexpo.online/home`)
1. Open **Notes** or **Messages** on a physical iOS device or simulator.
2. Type `https://learnexpo.online/home` and tap the link.
3. The link will open directly in the **Learn Expo** app.
4. *Or via Simulator CLI*:
   ```bash
   xcrun simctl openurl booted "https://learnexpo.online/home"
   ```

---

### Testing on Android

#### A. Custom Scheme (`learn://`)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "learn://home" com.questerstudios.learn
```

#### B. Android App Links (`https://learnexpo.online/home`)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "https://learnexpo.online/home" com.questerstudios.learn
```

#### C. Verifying App Link Domain Verification Status on Android
To check if Android OS has successfully verified the domain for the installed app:

```bash
adb shell pm get-app-links com.questerstudios.learn
```

**Expected Output:**
```
com.questerstudios.learn:
    ID: ...
    Signatures: [...]
    Domain verification state:
      learnexpo.online: verified
```

If it shows `legacy_failure` or `not_verified`, force manual re-verification:
```bash
adb shell pm verify-app-links --re-verify com.questerstudios.learn
```

#### D. Checking Device UI Settings
1. Open **Settings** → **Apps** → **Learn Expo** (or your app name).
2. Tap **Open by default**.
3. Under **Supported links / Verified links**, verify that `learnexpo.online` is enabled.

---

## 6. Route Handling in Expo Router

Expo Router automatically matches incoming deep link URLs to the file system routes in `src/app/`.

- `https://learnexpo.online/home` → opens `src/app/(tabs)/home.tsx` (or matching route).
- `learn://home` → opens `src/app/(tabs)/home.tsx`.
- Query parameters (e.g. `https://learnexpo.online/home?ref=123`) are accessible via `useLocalSearchParams()`:

```tsx
import { useLocalSearchParams } from 'expo-router';

export default function HomeScreen() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  // ...
}
```

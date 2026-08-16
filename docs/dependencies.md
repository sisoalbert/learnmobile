# Learn Expo Dependencies Checklist

**Document Version:** 1.0  
**Related architecture:** `architecture.md`  
**Status legend:** `[x]` selected or required · `[ ]` optional or deferred

> Install Expo SDK packages with `npx expo install` so Expo selects versions compatible with the project's SDK.

---

## 1. Core Application

- [x] `expo`
  - Expo runtime and native module foundation.

- [x] `react`
  - React runtime.

- [x] `react-native`
  - Native application runtime.

- [x] `typescript`
  - Static typing for the application and Convex backend.

### Install

```bash
npx create-expo-app@latest learn-expo
```

---

## 2. Navigation and Screen Structure

- [x] `expo-router`
  - File-based navigation for onboarding, authentication, courses, lessons, exercises, profile, shop, and settings.

- [x] `react-native-safe-area-context`
  - Safe-area handling for notches, status bars, and home indicators.

- [x] `react-native-screens`
  - Native screen primitives used by navigation.

- [x] `expo-linking`
  - Deep links, authentication callbacks, and external links.

- [x] `expo-constants`
  - App configuration and runtime constants.

- [x] `expo-status-bar`
  - Status-bar appearance control.

### Install

```bash
npx expo install   expo-router   react-native-safe-area-context   react-native-screens   expo-linking   expo-constants   expo-status-bar
```

---

## Web Deployment

- [x] `wrangler`
  - Builds, validates, and deploys the exported Expo web application to Cloudflare Workers Static Assets.

### Commands

```bash
npm run build:web
npx wrangler deploy --dry-run
npm run deploy:web
```

See `deployment.md` for the production URL and full deployment configuration.

---

## 3. Backend and Realtime Data

- [x] `convex`
  - Convex React client, generated API bindings, queries, mutations, actions, subscriptions, database, scheduling, and file storage.

### Install

```bash
npm install convex
npx convex dev
```

---

## 4. Authentication

Choose one authentication implementation.

### Option A — Clerk

- [ ] `@clerk/clerk-expo`
  - Authentication UI and session management for Expo.

- [ ] `expo-secure-store`
  - Secure device storage for Clerk session tokens.

```bash
npm install @clerk/clerk-expo
npx expo install expo-secure-store
```

### Option B — Convex Auth

- [x] `@convex-dev/auth`
  - Authentication implemented directly with Convex.

```bash
npm install @convex-dev/auth
```

### Decision

- [ ] Select Clerk
- [x] Select Convex Auth
- [ ] Configure authenticated Convex provider
- [ ] Add `convex/auth.config.ts`
- [ ] Add development and production authentication environment variables
- [ ] Verify backend functions use `ctx.auth.getUserIdentity()`

---

## 5. Images, Mascot, and Static Assets

- [x] `expo-image`
  - Efficient image rendering, caching, transitions, and mascot illustrations.

- [ ] `expo-asset`
  - Bundled asset loading and local asset references.

### Install

```bash
npx expo install expo-image expo-asset
```

---

## 6. Audio

- [x] `expo-audio`
  - Lesson audio playback, sound effects, listening exercises, and future voice recording.

- [ ] `expo-speech`
  - Text-to-speech for pronunciation, accessibility, or generated lesson prompts.

- [ ] `expo-file-system`
  - Audio downloads, local caching, persistent recording files, and cache cleanup.

### Install

```bash
npx expo install expo-audio expo-file-system
```

Install speech only when the feature is implemented:

```bash
npx expo install expo-speech
```

### Deprecated Package

- [x] Do **not** install `expo-av`
  - Its audio and video APIs have been replaced by `expo-audio` and `expo-video`.

---

## 7. Video

- [ ] `expo-video`
  - Optional lesson demonstrations, tutorials, previews, and course media.

### Install when needed

```bash
npx expo install expo-video
```

---

## 8. Interaction Feedback and Animation

- [x] `expo-haptics`
  - Correct-answer, incorrect-answer, button, streak, and achievement feedback.

- [x] `react-native-reanimated`
  - Exercise transitions, path animations, feedback banners, mascot movement, and progress effects.

- [x] `react-native-gesture-handler`
  - Dragging, matching, word arrangement, swiping, and gesture-based interactions.

### Install

```bash
npx expo install   expo-haptics   react-native-reanimated   react-native-gesture-handler
```

### Optional Mascot Animation

- [x] `lottie-react-native`
  - Lightweight predefined mascot and celebration animations.

```bash
npx expo install lottie-react-native
```

---

## 9. Notifications, Device & Network

- [x] `expo-notifications`
  - Daily-goal reminders, streak reminders, quest updates, and learning notifications.

- [x] `expo-device`
  - Checks whether push notification registration is running on a physical device and provides device information.

- [ ] `@react-native-community/netinfo`
  - Network connection status, offline state detection, and network reachability monitoring.

### Install when needed

```bash
npx expo install expo-notifications expo-device @react-native-community/netinfo
```

### Configuration Checklist

- [x] Configure the `expo-notifications` app-config plugin
- [ ] Add Android notification icon and color
- [x] Confirm iOS notification permission requires no usage description
- [ ] Configure EAS credentials
- [x] Store per-installation devices and rotating Expo push tokens in Convex
- [x] Handle token refresh
- [x] Add notification preferences
- [x] Add notification deep links
- [ ] Test on physical Android and iOS devices

The Convex notification actions require `EXPO_PUSH_ACCESS_TOKEN` as a server-only environment
variable. Configure it independently on development and production deployments; never expose it
through an `EXPO_PUBLIC_*` variable.

Streak-at-risk email actions require `RESEND_API_KEY`. Optional server-only variables are
`STREAK_EMAIL_FROM`, `LEARN_EXPO_APP_URL`, and `RESEND_TEST_RECIPIENT`. The 30-minute Convex cron
uses each user's indexed `nextStreakEmailAt`; it does not scan the full user table.

---

## 10. Calendar and Sharing

These packages are not required for the core learning loop.

- [ ] `expo-calendar`
  - Optional calendar events for study plans, reminders, or scheduled learning sessions.

- [ ] `expo-sharing`
  - Optional sharing of certificates, achievements, progress images, files, or course links.

### Install when required

```bash
npx expo install expo-calendar expo-sharing
```

### Calendar Permission Checklist

- [ ] Add iOS calendar usage description
- [ ] Request permission only when the learner uses the calendar feature
- [ ] Handle denied and restricted permission states

---

## 11. Persistent Local State & State Management

- [x] `zustand`
  - Client state management store for user session and application state.

- [x] `@react-native-async-storage/async-storage`
  - Non-sensitive preferences such as onboarding completion, sound settings, daily-goal selection, and cached UI state.

- [x] `expo-secure-store`
  - Sensitive device values and authentication token storage where required.

### Install

```bash
npx expo install   @react-native-async-storage/async-storage   expo-secure-store
```

### Future Offline Learning

- [ ] `expo-sqlite`
  - Deferred durable lesson storage, download manifests, offline attempts, and synchronization outbox.

```bash
npx expo install expo-sqlite
```

---

## 12. Forms and Validation

Recommended for sign-up, sign-in, profile, goal setup, and settings forms.

- [ ] `react-hook-form`
  - Form state and field validation.

- [ ] `zod`
  - Shared TypeScript-friendly validation schemas.

- [ ] `@hookform/resolvers`
  - Connects Zod schemas to React Hook Form.

### Install

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

## 13. UI Utilities

- [x] `react-native-svg`
  - Progress rings, path visuals, custom icons, badges, matching lines, and charts.

- [x] `@react-native-vector-icons/lucide`
  - Lucide vector icon set for user interface elements.

- [ ] `@expo/vector-icons`
  - General-purpose interface icons. Included in standard Expo templates, but verify it is available.

### Install or verify

```bash
npx expo install react-native-svg @expo/vector-icons
```

### Optional Styling System

Choose one approach rather than installing several competing systems.

- [ ] NativeWind
- [ ] Tamagui
- [ ] Unistyles
- [x] React Native `StyleSheet` for the MVP

---

## 14. Data and Date Utilities

- [ ] `date-fns`
  - Date calculations and display formatting.

- [ ] `date-fns-tz`
  - User-local streak and daily-goal date handling with IANA time zones.

### Install

```bash
npm install date-fns date-fns-tz
```

---

## 15. Purchases and Subscriptions

The shop, gems, subscriptions, unlimited hearts, and paid boosts shown in the concept screens are post-MVP features.

Choose one purchase stack when monetization is implemented.

- [ ] `react-native-purchases`
  - RevenueCat subscriptions and in-app purchase management.

- [ ] `expo-iap`
  - Direct in-app purchase integration.

### Recommended option

- [ ] Select RevenueCat
- [ ] Configure App Store Connect products
- [ ] Configure Google Play products
- [ ] Configure entitlement validation
- [ ] Store entitlement state server-side
- [ ] Validate purchases on the backend
- [ ] Add restore-purchases flow

Do not install both purchase libraries without a clear need.

---

## 16. Analytics and Error Reporting

Select providers before beta testing.

### Product Analytics

- [ ] PostHog
- [ ] Amplitude
- [ ] Firebase Analytics

### Error Reporting

- [x] `@sentry/react-native`
  - Crash reporting, errors, traces, and release diagnostics.

### Sentry Install

```bash
npx expo install @sentry/react-native
```

### Required Analytics Events

- [ ] Onboarding completed
- [ ] Account created
- [ ] Course selected
- [ ] Placement test started
- [ ] Placement test completed
- [ ] Lesson started
- [ ] Exercise submitted
- [ ] Correct answer
- [ ] Incorrect answer
- [ ] Lesson abandoned
- [ ] Lesson completed
- [ ] Daily goal completed
- [ ] Streak increased
- [ ] Practice started
- [ ] Subscription screen opened
- [ ] Purchase completed

---

## 17. Testing

- [x] `jest`
  - Unit and integration test runner.

- [x] `jest-expo`
  - Jest preset configured for Expo.

- [x] `@testing-library/react-native`
  - Component and interaction testing.

- [ ] `@testing-library/jest-native`
  - React Native-specific test matchers where compatible with the selected testing setup.

### Install

```bash
npm install --save-dev   jest   jest-expo   @testing-library/react-native   @testing-library/jest-native
```

### End-to-End Testing

Choose one later:

- [ ] Maestro
- [ ] Detox

Maestro is the simpler default for the initial product.

---

## 18. Code Quality

- [x] `eslint`
  - Static code analysis.

- [x] `eslint-config-expo`
  - Expo-compatible lint configuration.

- [ ] `prettier`
  - Consistent formatting.

### Install

```bash
npm install --save-dev eslint eslint-config-expo prettier
```

### Optional Git Hooks

- [ ] `husky`
- [ ] `lint-staged`

```bash
npm install --save-dev husky lint-staged
```

---

## 19. Environment & Build Configuration

- [x] Expo public environment variables for non-secret client configuration
- [x] Convex environment variables for backend secrets
- [x] Separate development, preview, and production values
- [x] Android Firebase configuration via `google-services.json` in `app.json` (`expo.android.googleServicesFile`)
- [x] `.easignore` configuration to ignore unnecessary build assets (`/docs`, `/coverage`) and explicitly include `!google-services.json` for EAS Build uploads

### Required Variables

```text
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_APP_ENV=
```

Authentication-specific variables depend on the selected provider.

Possible examples:

```text
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_JWT_ISSUER_DOMAIN=
```

Backend-only secrets must be stored in Convex environment variables and must never use the `EXPO_PUBLIC_` prefix.

---

## 20. Recommended MVP Installation

This command covers the core libraries for the first Learn Expo release:

```bash
npx expo install   expo-router   react-native-safe-area-context   react-native-screens   expo-linking   expo-constants   expo-status-bar   expo-image   expo-asset   expo-audio   expo-file-system   expo-haptics   react-native-reanimated   react-native-gesture-handler   react-native-svg   @expo/vector-icons   @react-native-async-storage/async-storage   expo-secure-store
```

```bash
npm install   convex   react-hook-form   zod   @hookform/resolvers   date-fns   date-fns-tz
```

```bash
npm install --save-dev   jest   jest-expo   @testing-library/react-native   @testing-library/jest-native   eslint   eslint-config-expo   prettier
```

Then install exactly one authentication stack.

---

## 21. Feature-to-Dependency Map

| Product Feature | Required Package |
|---|---|
| File-based navigation | `expo-router` |
| Convex backend | `convex` |
| Mascot and course images | `expo-image`, `expo-asset` |
| Listening exercises | `expo-audio` |
| Audio caching | `expo-file-system` |
| Spoken prompts | `expo-speech` |
| Correct/incorrect feedback | `expo-haptics` |
| Word dragging and matching | `react-native-gesture-handler` |
| Animated feedback and mascot states | `react-native-reanimated` |
| Progress rings and custom paths | `react-native-svg` |
| Push reminders | `expo-notifications`, `expo-device` |
| Network status / offline detection | `@react-native-community/netinfo` |
| Video lessons | `expo-video` |
| Calendar study sessions | `expo-calendar` |
| Achievement sharing | `expo-sharing` |
| Non-sensitive preferences | Async Storage |
| Sensitive local values | `expo-secure-store` |
| Offline lesson database | `expo-sqlite` |
| Form state | `react-hook-form` |
| Form validation | `zod` |
| Local-date streak rules | `date-fns`, `date-fns-tz` |
| Subscriptions | RevenueCat or `expo-iap` |
| Crash reporting | Sentry |

---

## 22. Package Corrections

The original proposed list contained duplicates and one deprecated package.

### Normalized List

- [x] Replace `expo-av` with `expo-audio`
- [x] Use `expo-video` for video
- [x] Keep one `expo-haptics` entry
- [x] Keep one `expo-device` entry
- [x] Use lowercase npm package names
- [x] Add `expo-file-system` for downloaded audio and recordings
- [x] Add navigation peer dependencies
- [x] Add gesture and animation libraries for interactive exercises
- [x] Add persistent-storage packages
- [x] Keep Calendar, Sharing, Speech, Video, and Notifications feature-dependent

---

## 23. Final Dependency Decisions

### Required for MVP

- [x] Expo and React Native
- [x] Expo Router
- [x] Convex
- [x] One authentication solution (Convex Auth)
- [x] Expo Image
- [x] Expo Audio
- [x] Expo Haptics
- [x] Reanimated
- [x] Gesture Handler
- [x] React Native SVG
- [x] Async Storage
- [x] Secure Store
- [x] Expo Fonts (`expo-font`)
- [x] Expo Device (`expo-device`)
- [x] Lottie (`lottie-react-native`)
- [x] Sentry (`@sentry/react-native`)
- [x] EAS Build & `.easignore` configuration
- [x] Android `google-services.json` (`expo.android.googleServicesFile`)
- [x] Testing and linting

### Deferred

- [ ] Expo Asset
- [ ] Expo FileSystem
- [ ] Forms and validation (`react-hook-form`, `zod`, `@hookform/resolvers`)
- [ ] Date and timezone utilities (`date-fns`, `date-fns-tz`)
- [ ] Prettier
- [ ] `@testing-library/jest-native`
- [ ] Expo Speech
- [ ] Expo Video
- [ ] Expo Notifications
- [ ] `@react-native-community/netinfo`
- [ ] Expo Calendar
- [ ] Expo Sharing
- [ ] Expo SQLite
- [ ] In-app purchases
- [ ] Admob
- [ ] Analytics provider
- [ ] End-to-end testing framework

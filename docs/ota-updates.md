# OTA Updates Runbook

Learn Expo uses EAS Update and `expo-updates` to publish JavaScript and asset changes without submitting a new binary to the App Store or Play Store.

OTA updates cannot change native code. Adding or upgrading a native dependency, changing native configuration, or upgrading Expo SDK requires a new native build.

## Current configuration

The project uses:

- EAS project ID: `22c7498c-80f4-4791-bd83-f9d12f2f5758`
- Update URL: `https://u.expo.dev/22c7498c-80f4-4791-bd83-f9d12f2f5758`
- Runtime policy: `appVersion`
- Development channel: `development`
- Preview channel: `preview`
- Production channel: `production`
- Automatic update checks on app launch
- Manual update checks under **Profile > Settings > App updates**

The relevant configuration lives in:

- `app.json`: update URL, runtime policy, and startup behavior
- `eas.json`: channel assigned to each native build profile
- `package.json`: preview and production publishing commands

## Initial activation

Installing `expo-updates` changes the native application. Existing store builds that were created before this configuration cannot receive EAS updates.

Before releasing the first OTA-enabled build:

1. Increment `expo.version` in `app.json`, for example from `1.0.0` to `1.0.1`.
2. Build the preview application.
3. Publish and verify a preview update.
4. Build and submit the production application.

Create preview builds:

```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

After preview verification, create production builds:

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

The production binary must be released through TestFlight/App Store and the appropriate Play Store track before users can receive production OTA updates.

## Publishing an update

Only use OTA for JavaScript, TypeScript, application logic, styling, images, fonts, and other bundled assets that remain compatible with the installed native runtime.

### 1. Validate the change

```bash
npx tsc --noEmit
npm run lint -- --no-cache
npm test -- --runInBand
```

### 2. Publish to preview

```bash
npm run update:preview -- --message "Describe the update"
```

This publishes with:

- Channel: `preview`
- EAS environment: `preview`
- Runtime version derived from `expo.version`

### 3. Verify preview

Use a preview release build with the same app version. Force-close and reopen it up to two times:

1. The first launch checks for and downloads the update in the background.
2. The next launch runs the downloaded update.

Alternatively, open **Profile > Settings > App updates**, select **Check for updates**, and restart when prompted.

Verify sign-in, navigation, affected features, startup, and Sentry before publishing to production.

### 4. Publish to production

Publish the same verified commit:

```bash
npm run update:production -- --message "Describe the update"
```

Production builds on the `production` channel will download the update when the runtime version matches.

### 5. Confirm the published OTA and update the displayed push number

After EAS reports **Published**, keep the update group ID from the command output and confirm it is the latest production update:

```bash
eas update:list --branch production --limit 1
```

The app's displayed push number is managed manually in `app.config.ts`:

```ts
extra: {
  pushNumber: 2,
}
```

Before the next OTA, increase `pushNumber` by one and include that change in the update. EAS `autoIncrement` applies to native builds only; it does not increment this value for OTA updates. Because the value is bundled into the app update, changing it after publishing requires another OTA.

## Runtime compatibility

The project uses:

```json
{
  "runtimeVersion": {
    "policy": "appVersion"
  }
}
```

For app version `1.0.1`, native builds and OTA updates use runtime version `1.0.1`.

Do not change `expo.version` for an ordinary JavaScript-only update. Changing it creates a new runtime version, so existing builds will not receive that update.

Increment `expo.version` when publishing a new native release, especially after:

- Adding, removing, or upgrading a native package
- Changing an Expo config plugin
- Upgrading Expo SDK or React Native
- Changing native permissions or platform configuration
- Modifying files under `ios` or `android`

Create a new native build after incrementing the version.

## Update behavior

The app checks for an update when it launches. The launch is not delayed while downloading because `fallbackToCacheTimeout` is `0`.

When an update is available:

- The automatic flow downloads it in the background and applies it on a later restart.
- The manual Settings flow downloads it and offers **Restart now**.
- Manual update failures are reported to Sentry with `area: updates` and `operation: check_for_update`.

Expo Go and normal development mode do not provide the same update behavior as release builds. Use preview or production release builds for end-to-end testing.

## Environment variables

SDK 55 and later require an EAS environment when publishing. The project scripts provide it:

```json
{
  "update:preview": "eas update --channel preview --environment preview",
  "update:production": "eas update --channel production --environment production"
}
```

Configure public build variables, including `EXPO_PUBLIC_CONVEX_URL`, in the corresponding EAS environment. A production update must be bundled with production variables.

Never include secrets in `EXPO_PUBLIC_` variables because they are embedded in the downloadable JavaScript bundle.

## Rollouts

For a cautious production release, publish to a percentage of users:

```bash
eas update --channel production \
  --environment production \
  --message "Describe the update" \
  --rollout-percentage 10
```

Increase the percentage from the EAS dashboard or with `eas update:edit` after monitoring the rollout.

## Rollback

If a production update causes a regression, start the interactive rollback workflow:

```bash
eas update:rollback
```

Select the production channel and the last known-good update. Verify the rollback on a release build and monitor Sentry afterward.

For a small fix, publishing a corrected update to the same channel and runtime is also valid.

## Useful inspection commands

List recent updates:

```bash
eas update:list
```

Inspect a particular update:

```bash
eas update:view UPDATE_ID
```

Display the resolved Expo configuration:

```bash
npx expo config --type public
```

Check installed Expo package compatibility:

```bash
npx expo install --check
```

## Troubleshooting

### The installed app does not receive updates

Check that:

- The binary was built after `expo-updates` was configured.
- The build channel matches the published channel.
- The build and update have the same runtime version.
- The update was published with the correct EAS environment.
- The device has launched the app while online and then restarted it.

### Settings says updates are unavailable

This is expected in Expo Go and normal development mode. Test with a preview or production release build.

### An update works in preview but not production

Confirm that it was also published to the `production` channel and used `--environment production`. Preview and production channels are independent.

### A native change was published as OTA

Publish a new native build with an incremented `expo.version`. An OTA bundle cannot add native modules to an already installed binary.

## Release checklist

```text
Confirm the change is OTA-compatible
→ run TypeScript, lint, and tests
→ publish to preview
→ verify in a preview release build
→ publish the same commit to production
→ monitor Sentry and EAS Update
```

## References

- [Expo Updates SDK](https://docs.expo.dev/versions/latest/sdk/updates/)
- [Get started with EAS Update](https://docs.expo.dev/eas-update/getting-started/)
- [Deploy EAS updates](https://docs.expo.dev/eas-update/deployment/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)

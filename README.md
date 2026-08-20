# Welcome to your Expo app 👋
![App Screenshot](assets/photos/app.png)

# 1. Switch to version/1.0.6 and fast-forward merge main
git checkout version/1.0.6
git merge main --ff-only

# 2. Publish the OTA update
eas update --channel production --message "p2p message delete and copy"

# 3. update at [RELEASES.md](RELEASES.md) and merge it back to main

# 4 vercel prod

## Convex Backend Deployment

See [Convex Auth Setup and Production Runbook](docs/authentication.md) before deploying authentication changes.

# 1. Test development backend
```bash
npx convex dev
```

# 2. Deploy backend functions and schema to production
```bash
npx convex deploy
```

# 3. Build the Expo app with the production Convex URL
```bash
eas build --profile production
```

# Expo CLI Commands

````
git config --local --unset extensions.worktreeconfig
npx wrangler secret put <KEY>
npx instant-cli push schema --yes
npx instant-cli push perms --yes
npm install expo --fix
npx expo install --check
npx expo-doctor   
npm run web
npx expo run:ios
npx expo run:android


npx expo run:android --device
npx expo run:ios --device

npx expo run:ios
npx expo run:ios --device
npx expo run:android
npx expo run:android --device
npx expo prebuild --clean
eas build --platform android --local
eas build --platform ios --local
npx eas build --platform android --profile development --local
npx eas build --platform android --profile preview --local
npx eas build --platform ios --profile development --local
npx eas build --platform ios --profile preview --local
npx expo-router-sitemap (https://youtu.be/Yh6Qlg2CYwQ?si=wKH0CGw9-mTqRvcN)

```

```bash
npx expo start
````

```bash
npm run reset-project
```

```bash
npx expo prebuild --clean
```

```bash
npx expo prebuild --platform android
```

```bash
npx expo prebuild --platform ios
```

```bash
npx expo run:ios
```
```bash
npx expo run:ios --device
```

```bash
npx expo run:android
```

```bash
eas build -p android --profile preview --local
```

```bash
eas build -p android --profile preview
```

```bash
eas build -p android --profile preview --local
```

```bash
eas build -p android --profile production
```

```bash
eas build -p ios
```

```bash
eas build -p ios --profile preview
```

```bash
eas build -p ios --profile production
```

```bash
eas build -p web
```

```bash
eas build -p web --profile preview
```

```bash
eas build -p web --profile production
```

```bash
npx expo start --android
```

```bash
npx expo start --ios
```

```bash
npx expo start --web
```

```bash
npx expo start --clear-cache
```

```bash
eas build --platform android
```

```bash
eas build --platform ios
```

```bash
eas build --platform web
```

```bash
eas build --platform web --profile preview
```

```bash
eas build --platform web --profile production
```

```bash
eas submit --platform ios
```

```bash
eas submit --platform android
```

## OTA Updates (EAS Update)

Push over-the-air JavaScript/asset updates without a new store build.

See the complete [OTA Updates Runbook](docs/ota-updates.md) for initial activation, preview testing, production rollout, and rollback procedures.

### Publish an update

```bash
npm run update:preview -- --message "Description of changes"
npm run update:production -- --message "Description of changes"
```

SDK 55 and later require the matching EAS environment when publishing. The scripts select `preview` or `production` so the update is bundled with the correct environment variables.

### Runtime version

The project uses the `appVersion` runtime policy. JavaScript and asset-only updates can target installed builds with the same `version` from `app.json`.

Changing native dependencies or native configuration requires a new store build. Bump `version` for that build; the new version creates a new OTA runtime boundary.

### Channels

| Channel       | Profile          | Use case                  |
|---------------|------------------|---------------------------|
| `production`  | `production`     | Live app store users      |
| `preview`     | `preview`        | Internal testing (TestFlight / internal track) |
| `development` | `development`    | Dev client builds         |

### Workflow

1. Make your JS/asset changes
2. Publish to preview with `npm run update:preview -- --message "your message"`
3. Verify the update in a preview release build
4. Publish the verified commit with `npm run update:production -- --message "your message"`
5. Production builds download updates on launch and apply them after restart, or users can check manually in Settings

## Deep Linking (Universal Links & App Links)

Learn Expo supports custom URL schemes (`learn://`) and verified domain links (`https://learnexpo.online/...`) on both iOS and Android.

See the complete [Deep Linking Runbook](docs/deep-linking.md) for configuration details, SHA-256 certificate fingerprints, Cloudflare `.well-known` deployment, and platform verification commands.


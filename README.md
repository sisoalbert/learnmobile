# Welcome to your Expo app 👋
![App Screenshot](assets/photos/app.png)

# 1. Switch to version/1.0.6 and fast-forward merge main
git checkout version/1.0.6
git merge main --ff-only

# 2. Publish the OTA update
eas update --channel production --message "p2p message delete and copy"

# 3. update at [RELEASES.md](RELEASES.md) and merge it back to main

# 4 vercel prod
vercel --prod

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

### Publish an update

```bash
npx eas-cli update --channel production --message "Description of changes" --non-interactive
```

### Build number

Each OTA update has a `buildNumber` in `app.config.js` (`extra.buildNumber`). Bump it before publishing so users can see which update they're on in the **App Updates** screen (`Settings > App Updates`), displayed as `1.0.0 (2)`.

The `buildNumber` is independent of `version` — changing `version` changes the `runtimeVersion` (due to `appVersion` policy), which means the update won't reach existing users. Only bump `version` when shipping a new native build.

### Channels

| Channel       | Profile          | Use case                  |
|---------------|------------------|---------------------------|
| `production`  | `production`     | Live app store users      |
| `preview`     | `preview`        | Internal testing (TestFlight / internal track) |
| `development` | `development`    | Dev client builds         |

cd moneytracker-app && eas update --channel production --message "Add real-time moreBanner subscription"

### Workflow

1. Make your JS/asset changes
2. Bump `extra.buildNumber` in `app.config.js`
3. Run `npx eas-cli update --channel production --message "your message" --non-interactive`
4. Users pick up the update automatically or via the App Updates screen
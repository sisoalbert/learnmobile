import { getAdMobConfig, isProductionAdBuild } from './src/services/ads/admob-config';

const adMobConfig = getAdMobConfig(process.env);
const isProduction = isProductionAdBuild(process.env);

if (isProduction && (!process.env.ADMOB_ANDROID_APP_ID || !process.env.ADMOB_IOS_APP_ID)) {
  console.warn(
    'AdMob production build is missing ADMOB_ANDROID_APP_ID or ADMOB_IOS_APP_ID; using test App IDs.',
  );
}

export default {
  expo: {
    name: 'Learn Expo',
    slug: 'learn',
    version: '1.0.3',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'learn',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: 'com.questerstudios.learn',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: 'com.questerstudios.learn',
      googleServicesFile: './google-services.json',
    },
    web: {
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#2289FD',
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
        },
      ],
      'expo-web-browser',
      'expo-secure-store',
      'expo-notifications',
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          project: 'learnmobile-expo',
          organization: 'learnmobile',
        },
      ],
      [
        'expo-audio',
        {
          enableBackgroundPlayback: false,
          enableBackgroundRecording: false,
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: adMobConfig.androidAppId,
          iosAppId: adMobConfig.iosAppId,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      adMob: {
        isProduction,
      },
      eas: {
        projectId: '22c7498c-80f4-4791-bd83-f9d12f2f5758',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/22c7498c-80f4-4791-bd83-f9d12f2f5758',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
  },
};

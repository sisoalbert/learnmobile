import { createElement, type ComponentType } from 'react';
import Constants from 'expo-constants';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';
import { StyleSheet, View } from 'react-native';

import { getAdMobConfig, isProductionAdBuild } from './admob-config';

type NativeAdsModule = {
  default: () => { initialize: () => Promise<unknown> };
  AdEventType: { LOADED: string; CLOSED: string; ERROR: string };
  BannerAd: ComponentType<Record<string, unknown>>;
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: string };
  InterstitialAd: {
    createForAdRequest: (unitId: string) => {
      addAdEventListener: (event: string, listener: () => void) => () => void;
      load: () => void;
      show: () => void;
    };
  };
  TestIds: { BANNER: string; INTERSTITIAL: string };
};

const nativeAds: NativeAdsModule = {
  default: mobileAds,
  AdEventType,
  BannerAd: BannerAd as ComponentType<Record<string, unknown>>,
  BannerAdSize,
  InterstitialAd,
  TestIds,
};

let initializationPromise: Promise<unknown> | null = null;

function getAdMobConfigForRuntime() {
  const configuredProduction = Constants.expoConfig?.extra?.adMob?.isProduction;
  const production = typeof configuredProduction === 'boolean'
    ? configuredProduction
    : isProductionAdBuild(process.env);
  return getAdMobConfig(process.env, production);
}

export function initializeAdMob() {
  if (!initializationPromise) initializationPromise = nativeAds.default().initialize();
  return initializationPromise;
}

export function AdMobBanner() {
  const config = getAdMobConfigForRuntime();

  return createElement(
    View,
    { accessibilityLabel: 'Advertisement', style: styles.bannerContainer },
    createElement(nativeAds.BannerAd, {
      unitId: config.bannerAdUnitId || nativeAds.TestIds.BANNER,
      size: nativeAds.BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
      onAdFailedToLoad: () => undefined,
    }),
  );
}

export async function showInterstitialAd(): Promise<void> {
  const config = getAdMobConfigForRuntime();
  await initializeAdMob().catch(() => undefined);

  return new Promise((resolve) => {
    const interstitial = nativeAds.InterstitialAd.createForAdRequest(
      config.interstitialAdUnitId || nativeAds.TestIds.INTERSTITIAL,
    );
    let finished = false;
    let unsubscribeLoaded: (() => void) | undefined;
    let unsubscribeClosed: (() => void) | undefined;
    let unsubscribeError: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      unsubscribeLoaded?.();
      unsubscribeClosed?.();
      unsubscribeError?.();
      if (timeout) clearTimeout(timeout);
      resolve();
    };

    unsubscribeLoaded = interstitial.addAdEventListener(nativeAds.AdEventType.LOADED, () => {
      try {
        interstitial.show();
      } catch {
        finish();
      }
    });
    unsubscribeClosed = interstitial.addAdEventListener(nativeAds.AdEventType.CLOSED, finish);
    unsubscribeError = interstitial.addAdEventListener(nativeAds.AdEventType.ERROR, finish);

    timeout = setTimeout(finish, 10_000);

    try {
      interstitial.load();
    } catch {
      finish();
    }
  });
}

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    minHeight: 50,
    paddingTop: 4,
    backgroundColor: '#FFFFFF',
  },
});

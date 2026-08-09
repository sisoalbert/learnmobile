export declare const TEST_ANDROID_APP_ID: string;
export declare const TEST_IOS_APP_ID: string;
export declare const TEST_BANNER_AD_UNIT_ID: string;
export declare const TEST_INTERSTITIAL_AD_UNIT_ID: string;

export type AdMobEnvironment = {
  NODE_ENV?: string;
  EAS_BUILD_PROFILE?: string;
  ADMOB_ANDROID_APP_ID?: string;
  ADMOB_IOS_APP_ID?: string;
  EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID?: string;
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID?: string;
};

export type AdMobConfig = {
  isProduction: boolean;
  androidAppId: string;
  iosAppId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
};

export declare function isProductionAdBuild(environment: AdMobEnvironment): boolean;
export declare function getAdMobConfig(environment: AdMobEnvironment, production?: boolean): AdMobConfig;

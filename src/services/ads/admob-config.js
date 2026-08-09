const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

function isProductionAdBuild(environment) {
  if (environment.EAS_BUILD_PROFILE) return environment.EAS_BUILD_PROFILE === 'production';
  return environment.NODE_ENV === 'production';
}

function getAdMobConfig(environment, production = isProductionAdBuild(environment)) {
  return {
    isProduction: production,
    androidAppId: production ? environment.ADMOB_ANDROID_APP_ID || TEST_ANDROID_APP_ID : TEST_ANDROID_APP_ID,
    iosAppId: production ? environment.ADMOB_IOS_APP_ID || TEST_IOS_APP_ID : TEST_IOS_APP_ID,
    bannerAdUnitId: production
      ? environment.EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID || TEST_BANNER_AD_UNIT_ID
      : TEST_BANNER_AD_UNIT_ID,
    interstitialAdUnitId: production
      ? environment.EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID || TEST_INTERSTITIAL_AD_UNIT_ID
      : TEST_INTERSTITIAL_AD_UNIT_ID,
  };
}

module.exports = {
  TEST_ANDROID_APP_ID,
  TEST_IOS_APP_ID,
  TEST_BANNER_AD_UNIT_ID,
  TEST_INTERSTITIAL_AD_UNIT_ID,
  isProductionAdBuild,
  getAdMobConfig,
};

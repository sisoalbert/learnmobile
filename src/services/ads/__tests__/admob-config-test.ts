import {
  getAdMobConfig,
  isProductionAdBuild,
  TEST_ANDROID_APP_ID,
  TEST_BANNER_AD_UNIT_ID,
  TEST_INTERSTITIAL_AD_UNIT_ID,
  TEST_IOS_APP_ID,
} from '../admob-config';

const productionValues = {
  ADMOB_ANDROID_APP_ID: 'android-production-app-id',
  ADMOB_IOS_APP_ID: 'ios-production-app-id',
  EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID: 'banner-production-unit-id',
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID: 'interstitial-production-unit-id',
};

describe('AdMob build configuration', () => {
  test.each([
    { NODE_ENV: 'development' },
    { NODE_ENV: 'production', EAS_BUILD_PROFILE: 'development' },
    { NODE_ENV: 'production', EAS_BUILD_PROFILE: 'preview' },
  ])('uses test IDs outside the production EAS profile: %p', (environment) => {
    expect(isProductionAdBuild(environment)).toBe(environment.NODE_ENV === 'production' && !environment.EAS_BUILD_PROFILE);
    expect(getAdMobConfig({ ...environment, ...productionValues })).toMatchObject({
      androidAppId: TEST_ANDROID_APP_ID,
      iosAppId: TEST_IOS_APP_ID,
      bannerAdUnitId: TEST_BANNER_AD_UNIT_ID,
      interstitialAdUnitId: TEST_INTERSTITIAL_AD_UNIT_ID,
    });
  });

  test('uses configured IDs for the production EAS profile', () => {
    const environment = { NODE_ENV: 'production', EAS_BUILD_PROFILE: 'production', ...productionValues };

    expect(isProductionAdBuild(environment)).toBe(true);
    expect(getAdMobConfig(environment)).toMatchObject({
      androidAppId: productionValues.ADMOB_ANDROID_APP_ID,
      iosAppId: productionValues.ADMOB_IOS_APP_ID,
      bannerAdUnitId: productionValues.EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID,
      interstitialAdUnitId: productionValues.EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID,
    });
  });

  test('falls back to valid test IDs when production values are missing', () => {
    expect(getAdMobConfig({ NODE_ENV: 'production', EAS_BUILD_PROFILE: 'production' })).toMatchObject({
      androidAppId: TEST_ANDROID_APP_ID,
      iosAppId: TEST_IOS_APP_ID,
      bannerAdUnitId: TEST_BANNER_AD_UNIT_ID,
      interstitialAdUnitId: TEST_INTERSTITIAL_AD_UNIT_ID,
    });
  });
});

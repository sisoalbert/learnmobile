import { LEARN_EXPO_PRO_ENTITLEMENT_ID, hasActiveProEntitlement } from '../revenuecat-provider';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('react-native-purchases-ui', () => ({
  __esModule: true,
  default: {},
  PAYWALL_RESULT: {},
}));

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

describe('RevenueCat entitlement access', () => {
  it('recognizes only an active Learn Expo Pro entitlement', () => {
    expect(hasActiveProEntitlement({
      entitlements: { active: { [LEARN_EXPO_PRO_ENTITLEMENT_ID]: { identifier: LEARN_EXPO_PRO_ENTITLEMENT_ID } } },
    } as never)).toBe(true);

    expect(hasActiveProEntitlement({
      entitlements: { active: { another_entitlement: {} } },
    } as never)).toBe(false);
  });
});

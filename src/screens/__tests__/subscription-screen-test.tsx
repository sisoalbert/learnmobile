import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SubscriptionScreen from '../SubscriptionScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPresentPaywall = jest.fn();
const mockRestorePurchases = jest.fn();
const mockPresentCustomerCenter = jest.fn();
const mockRevenueCat = {
  errorMessage: null as string | null,
  hasPro: false,
  presentCustomerCenter: mockPresentCustomerCenter,
  presentPaywall: mockPresentPaywall,
  restorePurchases: mockRestorePurchases,
  status: 'ready' as const,
};
let mockIsAuthenticated = true;
let mockIsNative = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    canGoBack: () => true,
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('react-native-purchases-ui', () => ({
  PAYWALL_RESULT: {
    CANCELLED: 'CANCELLED',
    ERROR: 'ERROR',
    NOT_PRESENTED: 'NOT_PRESENTED',
    PURCHASED: 'PURCHASED',
    RESTORED: 'RESTORED',
  },
}));

jest.mock('@/services/feedback', () => ({
  feedback: { play: jest.fn() },
}));

jest.mock('@/services/revenuecat', () => ({
  get isNativeRevenueCatPlatform() {
    return mockIsNative;
  },
  useRevenueCat: () => mockRevenueCat,
}));

jest.mock('@/state/sessionStore', () => ({
  useSessionStore: (selector: (state: { isAuthenticated: boolean }) => boolean) => selector({
    isAuthenticated: mockIsAuthenticated,
  }),
}));

describe('SubscriptionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockIsNative = true;
    mockRevenueCat.hasPro = false;
    mockRevenueCat.errorMessage = null;
    mockRevenueCat.status = 'ready';
    mockPresentPaywall.mockResolvedValue('CANCELLED');
    mockRestorePurchases.mockResolvedValue(null);
    mockPresentCustomerCenter.mockResolvedValue(true);
  });

  it('renders the managed-paywall entry point and benefits', () => {
    const { getByText } = render(<SubscriptionScreen />);

    expect(getByText('LEARN EXPO PRO')).toBeTruthy();
    expect(getByText('Unlock Your Full Potential')).toBeTruthy();
    expect(getByText('100% Ad-Free Experience')).toBeTruthy();
    expect(getByText('VIEW PRO PLANS')).toBeTruthy();
  });

  it('presents the native RevenueCat paywall and handles a purchase', async () => {
    mockPresentPaywall.mockResolvedValue('PURCHASED');
    const { getByLabelText, getByText } = render(<SubscriptionScreen />);

    fireEvent.press(getByLabelText('View Pro plans'));

    await waitFor(() => expect(mockPresentPaywall).toHaveBeenCalledTimes(1));
    expect(getByText('Welcome to Learn Expo Pro!')).toBeTruthy();
  });

  it('restores purchases through RevenueCat', async () => {
    mockRestorePurchases.mockResolvedValue({ entitlements: { active: {} } });
    const { getByLabelText, getByText } = render(<SubscriptionScreen />);

    fireEvent.press(getByLabelText('Restore purchases'));

    await waitFor(() => expect(mockRestorePurchases).toHaveBeenCalledTimes(1));
    expect(getByText('Your purchase history has been refreshed.')).toBeTruthy();
  });

  it('blocks guest purchases and routes to sign in', () => {
    mockIsAuthenticated = false;
    const { getByLabelText } = render(<SubscriptionScreen />);

    fireEvent.press(getByLabelText('View Pro plans'));

    expect(mockPresentPaywall).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/signin');
  });

  it('does not invoke native purchases on web', () => {
    mockIsNative = false;
    const { getByLabelText, getByText } = render(<SubscriptionScreen />);

    fireEvent.press(getByLabelText('View Pro plans'));

    expect(mockPresentPaywall).not.toHaveBeenCalled();
    expect(getByText('Subscriptions are currently available in the Learn Expo mobile app.')).toBeTruthy();
  });

  it('opens Customer Center for an entitled customer', async () => {
    mockRevenueCat.hasPro = true;
    const { getByLabelText } = render(<SubscriptionScreen />);

    fireEvent.press(getByLabelText('Manage subscription'));

    await waitFor(() => expect(mockPresentCustomerCenter).toHaveBeenCalledTimes(1));
  });

  it('closes using router navigation', () => {
    const { getByLabelText } = render(<SubscriptionScreen />);

    fireEvent.press(getByLabelText('Close subscription screen'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

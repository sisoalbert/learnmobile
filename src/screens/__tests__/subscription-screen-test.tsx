import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import SubscriptionScreen from '../SubscriptionScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock('@/services/feedback', () => ({
  feedback: {
    play: jest.fn(),
  },
}));

describe('SubscriptionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with title and benefits', () => {
    const { getByText } = render(<SubscriptionScreen />);

    expect(getByText('LEARN EXPO SUPER')).toBeTruthy();
    expect(getByText('Unlock Your Full Potential')).toBeTruthy();
    expect(getByText('100% Ad-Free Experience')).toBeTruthy();
    expect(getByText('Unlimited Hearts & Practice')).toBeTruthy();
  });

  it('allows selecting billing plans', () => {
    const { getByText } = render(<SubscriptionScreen />);

    const monthlyPlan = getByText('1 Month');
    fireEvent.press(monthlyPlan);

    expect(getByText('SUBSCRIBE NOW')).toBeTruthy();

    const annualPlan = getByText('12 Months');
    fireEvent.press(annualPlan);

    expect(getByText('START 7-DAY FREE TRIAL')).toBeTruthy();
  });

  it('triggers router back when closing or subscribing', () => {
    const { getByText, getByLabelText } = render(<SubscriptionScreen />);

    fireEvent.press(getByText('START 7-DAY FREE TRIAL'));
    expect(mockBack).toHaveBeenCalledTimes(1);

    fireEvent.press(getByLabelText('Close subscription screen'));
    expect(mockBack).toHaveBeenCalledTimes(2);
  });
});

import { render, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';

import { initializeAdMob } from '../admob';
import { MobileAdsFeatureProvider } from '../mobile-ads-feature';

jest.mock('../admob', () => ({
  initializeAdMob: jest.fn(() => Promise.resolve()),
}));

const mockInitializeAdMob = initializeAdMob as jest.MockedFunction<typeof initializeAdMob>;

describe('MobileAdsFeatureProvider', () => {
  beforeEach(() => {
    mockInitializeAdMob.mockClear();
  });

  test.each([false, undefined])('does not initialize mobile ads when enabled is %s', (enabled) => {
    render(
      <MobileAdsFeatureProvider enabled={enabled}>
        <View />
      </MobileAdsFeatureProvider>,
    );

    expect(mockInitializeAdMob).not.toHaveBeenCalled();
  });

  test('initializes mobile ads after the flag becomes enabled', async () => {
    const screen = render(
      <MobileAdsFeatureProvider enabled={undefined}>
        <View />
      </MobileAdsFeatureProvider>,
    );

    screen.rerender(
      <MobileAdsFeatureProvider enabled>
        <View />
      </MobileAdsFeatureProvider>,
    );

    await waitFor(() => expect(mockInitializeAdMob).toHaveBeenCalledTimes(1));
  });
});

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

  test.each([
    { inLesson: false, endOfLesson: false },
    { inLesson: undefined, endOfLesson: undefined },
  ])('does not initialize mobile ads when both placements are disabled or loading', (flags) => {
    render(
      <MobileAdsFeatureProvider flags={flags}>
        <View />
      </MobileAdsFeatureProvider>,
    );

    expect(mockInitializeAdMob).not.toHaveBeenCalled();
  });

  test('initializes mobile ads after the flag becomes enabled', async () => {
    const screen = render(
      <MobileAdsFeatureProvider flags={{ inLesson: undefined, endOfLesson: undefined }}>
        <View />
      </MobileAdsFeatureProvider>,
    );

    screen.rerender(
      <MobileAdsFeatureProvider flags={{ inLesson: true, endOfLesson: false }}>
        <View />
      </MobileAdsFeatureProvider>,
    );

    await waitFor(() => expect(mockInitializeAdMob).toHaveBeenCalledTimes(1));
  });

  test('initializes mobile ads when only end-of-lesson ads are enabled', async () => {
    render(
      <MobileAdsFeatureProvider flags={{ inLesson: false, endOfLesson: true }}>
        <View />
      </MobileAdsFeatureProvider>,
    );

    await waitFor(() => expect(mockInitializeAdMob).toHaveBeenCalledTimes(1));
  });
});

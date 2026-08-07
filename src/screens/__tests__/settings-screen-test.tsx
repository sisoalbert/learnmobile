import { fireEvent, render } from '@testing-library/react-native';

import { feedback, useFeedbackPreferencesStore } from '@/services/feedback';
import { useOnboardingStore } from '@/state/onboarding-store';
import SettingsScreen from '../SettingsScreen';

const mockReplace = jest.fn();

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => false, replace: mockReplace }),
}));

describe('feedback settings', () => {
  const feedbackPlay = jest.spyOn(feedback, 'play').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.setState({ hasHydrated: true });
    useFeedbackPreferencesStore.setState({
      hasHydrated: true,
      soundEffectsEnabled: true,
      hapticFeedbackEnabled: true,
    });
  });

  test('allows sound and haptics to be disabled independently', () => {
    const screen = render(<SettingsScreen />);

    fireEvent(screen.getByLabelText('Sound effects'), 'valueChange', false);
    expect(useFeedbackPreferencesStore.getState()).toMatchObject({
      soundEffectsEnabled: false,
      hapticFeedbackEnabled: true,
    });

    fireEvent(screen.getByLabelText('Haptic feedback'), 'valueChange', false);
    expect(useFeedbackPreferencesStore.getState()).toMatchObject({
      soundEffectsEnabled: false,
      hapticFeedbackEnabled: false,
    });
    expect(feedbackPlay).toHaveBeenCalledWith('buttonTap');
  });

  test('applies a newly enabled feedback channel before previewing it', () => {
    useFeedbackPreferencesStore.setState({
      soundEffectsEnabled: false,
      hapticFeedbackEnabled: false,
    });
    const screen = render(<SettingsScreen />);

    fireEvent(screen.getByLabelText('Sound effects'), 'valueChange', true);
    expect(useFeedbackPreferencesStore.getState().soundEffectsEnabled).toBe(true);
    expect(feedbackPlay).toHaveBeenCalledWith('buttonTap');
  });
});

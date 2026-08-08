import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { feedback, useFeedbackPreferencesStore } from '@/services/feedback';
import { useOnboardingStore } from '@/state/onboarding-store';
import { clearAllZustandStores } from '@/state/clear-all-zustand-stores';
import SettingsScreen from '../SettingsScreen';

const mockReplace = jest.fn();
const mockSignOutFromConvex = jest.fn();
let mockIsAuthenticated = false;

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signOut: mockSignOutFromConvex }),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: mockIsAuthenticated, isLoading: false }),
  useMutation: () => jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => false, replace: mockReplace }),
}));

jest.mock('@/state/clear-all-zustand-stores', () => ({
  clearAllZustandStores: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/common', () => ({
  Header: () => null,
}));

describe('feedback settings', () => {
  const feedbackPlay = jest.spyOn(feedback, 'play').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
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

  test('resets all local data for guest user without signing out from convex', async () => {
    mockIsAuthenticated = false;
    const screen = render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Reset onboarding data'));
    });

    await waitFor(() => {
      expect(mockSignOutFromConvex).not.toHaveBeenCalled();
      expect(clearAllZustandStores).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  test('resets all local data and signs out for authenticated user', async () => {
    mockIsAuthenticated = true;
    mockSignOutFromConvex.mockResolvedValue(undefined);
    const screen = render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Reset onboarding data'));
    });

    await waitFor(() => {
      expect(mockSignOutFromConvex).toHaveBeenCalled();
      expect(clearAllZustandStores).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});


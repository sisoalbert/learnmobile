import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { getFunctionName } from 'convex/server';

import { feedback, useFeedbackPreferencesStore } from '@/services/feedback';
import { useOnboardingStore } from '@/state/onboarding-store';
import { clearAllZustandStores } from '@/state/clear-all-zustand-stores';
import OnboardingSettingsScreen from '../OnboardingSettingsScreen';
import SettingsScreen from '../SettingsScreen';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSignOutFromConvex = jest.fn();
let mockIsAuthenticated = false;
let mockCurrentUser: { onboarding?: { reminderPreference?: 'enabled' | 'disabled' } } | null | undefined;
const mockUpdatePracticeReminders = jest.fn().mockResolvedValue(undefined);
const mockGetFunctionName = getFunctionName;

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signOut: mockSignOutFromConvex }),
}));

jest.mock('convex/react', () => {
  return {
    useConvexAuth: () => ({ isAuthenticated: mockIsAuthenticated, isLoading: false }),
    useMutation: (reference: unknown) =>
      mockGetFunctionName(reference as never) === 'users:updatePracticeReminders'
        ? mockUpdatePracticeReminders
        : jest.fn().mockResolvedValue(undefined),
    useQuery: () => mockIsAuthenticated ? mockCurrentUser : null,
  };
});

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => false, push: mockPush, replace: mockReplace }),
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
    mockCurrentUser = { onboarding: { reminderPreference: 'enabled' } };
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

  test('opens saved onboarding selections in their own screen', () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByLabelText('View onboarding selections'));

    expect(mockPush).toHaveBeenCalledWith('/settings/onboarding');
  });

  test('uses Convex onboarding data instead of another device’s local selections', () => {
    mockIsAuthenticated = true;
    mockCurrentUser = {};
    useOnboardingStore.setState({
      learningGoal: 'expo-fundamentals',
      motivations: ['career'],
    });

    const screen = render(<OnboardingSettingsScreen />);

    expect(screen.getByText('No saved onboarding selections.')).toBeTruthy();
    expect(screen.queryByText('Expo fundamentals')).toBeNull();
  });

  test('uses local onboarding selections for a guest', () => {
    useOnboardingStore.setState({ learningGoal: 'expo-fundamentals' });

    const screen = render(<OnboardingSettingsScreen />);

    expect(screen.getByText('Expo fundamentals')).toBeTruthy();
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

  test('persists the shared push and email reminder preference', async () => {
    mockIsAuthenticated = true;
    const screen = render(<SettingsScreen />);

    await act(async () => {
      fireEvent(screen.getByLabelText('Practice reminders'), 'valueChange', false);
    });

    expect(mockUpdatePracticeReminders).toHaveBeenCalledWith({ enabled: false });
    expect(useOnboardingStore.getState().reminderPreference).toBe('disabled');
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

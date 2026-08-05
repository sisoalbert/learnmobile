import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/state/sessionStore';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useOnboardingStore } from '@/state/onboarding-store';
import { useUserProfileStore } from '@/state/user-profile-store';

import CreateProfileFlowScreen from '../create-profile-flow-screen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignIn = jest.fn();
const mockNormalizeCurrentProfile = jest.fn();

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: () => mockNormalizeCurrentProfile,
}));

jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('create-profile flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ signingIn: true });
    mockNormalizeCurrentProfile.mockResolvedValue({ username: 'sam' });
    useSessionStore.getState().signOut();
    useUserProfileStore.getState().resetProfile();
    useLearningGoalStore.getState().resetGoal();
    useOnboardingStore.getState().resetOnboarding();
    useOnboardingStore.setState({
      isCompleted: true,
      learningGoal: 'expo-fundamentals',
      experienceLevel: 'javascript-typescript',
      expoExperience: 'tried-expo-go',
      motivations: ['own-app', 'career'],
      dailyGoalMinutes: 10,
      reminderPreference: 'enabled',
      learningPlan: 'guided',
      startingPoint: 'scratch',
    });
    useLearningGoalStore.setState({ selectedStreakGoal: 5, isCommitted: true });
  });

  function advanceToAge() {
    const screen = render(<CreateProfileFlowScreen />);
    fireEvent.press(screen.getByText('Create profile'));
    return screen;
  }

  function advanceToName() {
    const screen = advanceToAge();
    fireEvent.changeText(screen.getByPlaceholderText('Age'), '25');
    fireEvent.press(screen.getByText('Next'));
    return screen;
  }

  function advanceToEmail() {
    const screen = advanceToName();
    fireEvent.changeText(screen.getByPlaceholderText('First name'), 'Sam');
    fireEvent.changeText(screen.getByPlaceholderText('Last name'), 'Lee');
    fireEvent.press(screen.getByText('Next'));
    return screen;
  }

  function advanceToPassword() {
    const screen = advanceToEmail();
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'sam.lee@gmail.com');
    fireEvent.press(screen.getByText('Next'));
    return screen;
  }

  test('starts at the prompt and allows skipping home', () => {
    const screen = render(<CreateProfileFlowScreen />);

    expect(screen.getByText("Don’t lose your progress! Let’s create a profile.")).toBeTruthy();
    fireEvent.press(screen.getByText('Later'));

    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  test('validates age and exposes legal links only when complete', () => {
    const screen = advanceToAge();
    const ageInput = screen.getByPlaceholderText('Age');

    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState).toEqual({ disabled: true });
    expect(screen.queryByText('Terms')).toBeNull();

    fireEvent.changeText(ageInput, '121');
    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState).toEqual({ disabled: true });

    fireEvent.changeText(ageInput, '34 years');
    expect(ageInput.props.value).toBe('34');
    expect(screen.getByLabelText('Valid age')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState).toEqual({ disabled: false });
    expect(screen.getByText('Terms')).toBeTruthy();

    fireEvent.press(screen.getByText('Terms'));
    expect(mockPush).toHaveBeenCalledWith('/terms');
  });

  test('requires both names and preserves age when navigating back', () => {
    const screen = advanceToName();

    fireEvent.changeText(screen.getByPlaceholderText('First name'), 'Sam');
    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByPlaceholderText('Last name'), 'Lee');
    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState).toEqual({ disabled: false });

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(screen.getByPlaceholderText('Age').props.value).toBe('25');
  });

  test('shows an email correction and accepts the suggestion', () => {
    const screen = advanceToEmail();

    expect(screen.getByText('What is your email address, Sam Lee?')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'sam.lee@gmal.com');

    expect(screen.getByText('Invalid email address')).toBeTruthy();
    expect(screen.getByText('Use sam.lee@gmail.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(screen.getByText('Use sam.lee@gmail.com'));
    expect(screen.queryByText('Invalid email address')).toBeNull();
    expect(screen.getByPlaceholderText('Email').props.value).toBe('sam.lee@gmail.com');
    expect(screen.getByRole('button', { name: 'Next' }).props.accessibilityState).toEqual({ disabled: false });
  });

  test('creates a Convex Auth account and stores the authenticated profile', async () => {
    const screen = advanceToPassword();
    const passwordInput = screen.getByTestId('password-input');

    expect(passwordInput.props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByLabelText('Show password'));
    expect(screen.getByTestId('password-input').props.secureTextEntry).toBe(false);

    fireEvent.changeText(screen.getByTestId('password-input'), 'short');
    expect(screen.getByRole('button', { name: 'Create profile' }).props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create profile' }).props.accessibilityState).toEqual({ disabled: false });

    fireEvent.press(screen.getByRole('button', { name: 'Create profile' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('password', {
        email: 'sam.lee@gmail.com',
        password: 'password123',
        flow: 'signUp',
        name: 'Sam Lee',
        age: 25,
        firstName: 'Sam',
        lastName: 'Lee',
        onboarding: {
          completed: true,
          learningGoal: 'expo-fundamentals',
          experienceLevel: 'javascript-typescript',
          expoExperience: 'tried-expo-go',
          motivations: ['own-app', 'career'],
          dailyGoalMinutes: 10,
          reminderPreference: 'enabled',
          learningPlan: 'guided',
          startingPoint: 'scratch',
          streakGoal: 5,
        },
      });
      expect(screen.getByText('Welcome, Sam Lee! Your profile has been successfully created.')).toBeTruthy();
      expect(mockNormalizeCurrentProfile).toHaveBeenCalledWith({
        age: 25,
        firstName: 'Sam',
        lastName: 'Lee',
      });
    });

    expect(useSessionStore.getState()).toMatchObject({
      isAuthenticated: true,
      user: {
        id: 'sam.lee@gmail.com',
        email: 'sam.lee@gmail.com',
        name: 'Sam Lee',
      },
    });
    expect(useUserProfileStore.getState()).toMatchObject({
      age: 25,
      firstName: 'Sam',
      lastName: 'Lee',
      email: 'sam.lee@gmail.com',
      isAccountCreated: true,
    });
    expect(useUserProfileStore.getState()).not.toHaveProperty('password');

    fireEvent.press(screen.getByText('Continue'));
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  test('keeps the password step open and shows auth errors', async () => {
    mockSignIn
      .mockRejectedValueOnce(new Error('Account already exists'))
      .mockRejectedValueOnce(new Error('Invalid credentials'));
    const screen = advanceToPassword();

    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Create profile' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'An account with this email already exists. Try signing in.',
      );
    });

    expect(screen.queryByText('Welcome, Sam Lee! Your profile has been successfully created.')).toBeNull();
    expect(useSessionStore.getState().isAuthenticated).toBe(false);
    expect(useUserProfileStore.getState().isAccountCreated).toBe(false);
  });

  test('signs into and normalizes an existing account when the password matches', async () => {
    mockSignIn
      .mockRejectedValueOnce(new Error('Account already exists'))
      .mockResolvedValueOnce({ signingIn: true });
    const screen = advanceToPassword();

    fireEvent.changeText(screen.getByTestId('password-input'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Create profile' }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenNthCalledWith(2, 'password', {
        email: 'sam.lee@gmail.com',
        password: 'password123',
        flow: 'signIn',
      });
      expect(mockNormalizeCurrentProfile).toHaveBeenCalledWith({
        age: 25,
        firstName: 'Sam',
        lastName: 'Lee',
      });
      expect(screen.getByText('Welcome, Sam Lee! Your profile has been successfully created.')).toBeTruthy();
    });
  });

  test('closes age to home', () => {
    const screen = advanceToAge();
    fireEvent.press(screen.getByLabelText('Close profile creation'));
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});

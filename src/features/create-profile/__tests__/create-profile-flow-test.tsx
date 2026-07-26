import { fireEvent, render } from '@testing-library/react-native';

import { useSessionStore } from '@/state/sessionStore';

import CreateProfileFlowScreen from '../create-profile-flow-screen';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('create-profile flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().signOut();
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

  test('toggles password visibility and completes without authenticating', () => {
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
    expect(screen.getByText('Welcome, Sam Lee! Your profile has been successfully created.')).toBeTruthy();
    expect(useSessionStore.getState().isAuthenticated).toBe(false);

    fireEvent.press(screen.getByText('Continue'));
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  test('closes age to home', () => {
    const screen = advanceToAge();
    fireEvent.press(screen.getByLabelText('Close profile creation'));
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { useSessionStore } from '@/state/sessionStore';

import ForgotPasswordScreen from '../forgot-password-screen';
import SignInScreen from '../SignInScreen';

const mockSignIn = jest.fn();
const mockReplace = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: jest.fn(),
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');

  return {
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <Text accessibilityLabel={`Link to ${href}`}>{children}</Text>
    ),
    router: {
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      replace: mockReplace,
    },
    useRouter: () => ({
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      replace: mockReplace,
    }),
  };
});

jest.mock('@/common', () => ({
  Header: () => null,
}));

describe('forgot password flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue({ signingIn: false });
    useSessionStore.getState().signOut();
  });

  async function requestCode(email = '  SAM@Example.com ') {
    const screen = render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByLabelText('Email'), email);
    fireEvent.press(screen.getByLabelText('Send reset code'));

    await waitFor(() => {
      expect(screen.getByLabelText('Reset code')).toBeTruthy();
    });

    return screen;
  }

  test('links to forgot password from sign in', () => {
    const screen = render(<SignInScreen />);

    expect(screen.getByLabelText('Link to /forgot-password')).toHaveTextContent(
      'Forgot password?',
    );
  });

  test('normalizes the email and requests a reset code', async () => {
    const screen = await requestCode();

    expect(mockSignIn).toHaveBeenCalledWith('password', {
      email: 'sam@example.com',
      flow: 'reset',
    });
    expect(
      screen.getByText('If an account exists for that email, we sent an 8-digit reset code.'),
    ).toBeTruthy();
  });

  test('does not reveal whether the reset request failed', async () => {
    const error = new Error('InvalidAccountId');
    mockSignIn.mockRejectedValueOnce(error);

    const screen = await requestCode('unknown@example.com');

    expect(screen.getByLabelText('Reset code')).toBeTruthy();
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { area: 'auth', operation: 'request_password_reset' },
    });
  });

  test('resends the reset code', async () => {
    const screen = await requestCode();

    fireEvent.press(screen.getByLabelText('Resend reset code'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
    expect(mockSignIn).toHaveBeenLastCalledWith('password', {
      email: 'sam@example.com',
      flow: 'reset',
    });
  });

  test('resets the password, stores the session, and opens home', async () => {
    mockSignIn
      .mockResolvedValueOnce({ signingIn: false })
      .mockResolvedValueOnce({ signingIn: true });
    const screen = await requestCode();

    fireEvent.changeText(screen.getByLabelText('Reset code'), '12ab345678');
    fireEvent.changeText(screen.getByLabelText('New password'), 'new-password');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'new-password');
    fireEvent.press(screen.getByLabelText('Reset password'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenLastCalledWith('password', {
        email: 'sam@example.com',
        code: '12345678',
        newPassword: 'new-password',
        flow: 'reset-verification',
      });
      expect(mockReplace).toHaveBeenCalledWith('/home');
    });
    expect(useSessionStore.getState().user).toEqual({
      id: 'sam@example.com',
      email: 'sam@example.com',
    });
  });

  test('requires matching passwords of at least eight characters', async () => {
    const screen = await requestCode();

    fireEvent.changeText(screen.getByLabelText('Reset code'), '12345678');
    fireEvent.changeText(screen.getByLabelText('New password'), 'password-one');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'password-two');

    expect(screen.getByLabelText('Reset password')).toBeDisabled();
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  test('shows an invalid-code error without navigating', async () => {
    const error = new Error('Invalid code');
    mockSignIn
      .mockResolvedValueOnce({ signingIn: false })
      .mockRejectedValueOnce(error);
    const screen = await requestCode();

    fireEvent.changeText(screen.getByLabelText('Reset code'), '12345678');
    fireEvent.changeText(screen.getByLabelText('New password'), 'new-password');
    fireEvent.changeText(screen.getByLabelText('Confirm new password'), 'new-password');
    fireEvent.press(screen.getByLabelText('Reset password'));

    await waitFor(() => {
      expect(screen.getByText('That code is invalid or expired. Please try again.')).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalledWith('/home');
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { area: 'auth', operation: 'reset_password' },
    });
  });
});

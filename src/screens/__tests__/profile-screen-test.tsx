import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';

import { useSessionStore } from '@/state/sessionStore';

import ProfileScreen from '../ProfileScreen';

const mockDeleteCurrentUser = jest.fn();
const mockSignOutFromConvex = jest.fn();
const mockReplace = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signOut: mockSignOutFromConvex }),
}));

jest.mock('@sentry/react-native', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

jest.mock('convex/react', () => ({
  useMutation: () => mockDeleteCurrentUser,
  useQuery: () => ({ email: 'sam@example.com' }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/common', () => ({
  Header: () => null,
}));

describe('profile account actions', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteCurrentUser.mockResolvedValue({ deleted: true });
    mockSignOutFromConvex.mockResolvedValue(undefined);
    useSessionStore.getState().setAuthenticatedUser({ id: 'user-id' });
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  function confirmAccountDeletion() {
    const buttons = alertSpy.mock.calls[0][2];
    const destructiveButton = buttons?.find((button) => button.style === 'destructive');

    act(() => destructiveButton?.onPress?.());
  }

  function mockWebConfirmation(confirmed: boolean) {
    const platformProperty = jest.replaceProperty(Platform, 'OS', 'web');
    const confirmMock = jest.fn(() => confirmed);

    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: confirmMock,
    });

    return {
      confirmMock,
      restore: () => {
        Reflect.deleteProperty(window, 'confirm');
        platformProperty.restore();
      },
    };
  }

  test('places delete account below sign out for authenticated users', () => {
    const screen = render(<ProfileScreen name="Profile" />);

    expect(screen.getByLabelText('Sign out')).toBeTruthy();
    expect(screen.getByLabelText('Delete account')).toBeTruthy();
  });

  test('asks for confirmation before deleting', () => {
    const screen = render(<ProfileScreen name="Profile" />);

    fireEvent.press(screen.getByLabelText('Delete account'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete account?',
      'This permanently deletes your account and signs you out. This can’t be undone.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete account', style: 'destructive' }),
      ]),
    );
    expect(mockDeleteCurrentUser).not.toHaveBeenCalled();
  });

  test('deletes the account, clears auth, and returns to sign in', async () => {
    const screen = render(<ProfileScreen name="Profile" />);

    fireEvent.press(screen.getByLabelText('Delete account'));
    confirmAccountDeletion();

    await waitFor(() => {
      expect(mockDeleteCurrentUser).toHaveBeenCalledWith({});
      expect(mockSignOutFromConvex).toHaveBeenCalledTimes(1);
      expect(useSessionStore.getState().isAuthenticated).toBe(false);
      expect(mockReplace).toHaveBeenCalledWith('/signin');
    });
  });

  test('uses the browser confirmation before deleting on web', async () => {
    const browser = mockWebConfirmation(true);

    try {
      const screen = render(<ProfileScreen name="Profile" />);

      fireEvent.press(screen.getByLabelText('Delete account'));

      expect(browser.confirmMock).toHaveBeenCalledWith(
        'Delete account?\n\nThis permanently deletes your account and signs you out. This can’t be undone.',
      );

      await waitFor(() => {
        expect(mockDeleteCurrentUser).toHaveBeenCalledWith({});
        expect(mockSignOutFromConvex).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith('/signin');
      });
    } finally {
      browser.restore();
    }
  });

  test('keeps the account when browser confirmation is cancelled', () => {
    const browser = mockWebConfirmation(false);

    try {
      const screen = render(<ProfileScreen name="Profile" />);

      fireEvent.press(screen.getByLabelText('Delete account'));

      expect(browser.confirmMock).toHaveBeenCalledTimes(1);
      expect(mockDeleteCurrentUser).not.toHaveBeenCalled();
    } finally {
      browser.restore();
    }
  });

  test('preserves the session and reports a failed deletion', async () => {
    const error = new Error('offline');
    mockDeleteCurrentUser.mockRejectedValue(error);
    const screen = render(<ProfileScreen name="Profile" />);

    fireEvent.press(screen.getByLabelText('Delete account'));
    confirmAccountDeletion();

    await waitFor(() => {
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        tags: { area: 'auth', operation: 'delete_account' },
      });
      expect(alertSpy).toHaveBeenLastCalledWith(
        'Unable to delete account',
        'Please check your connection and try again.',
      );
      expect(useSessionStore.getState().isAuthenticated).toBe(true);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});

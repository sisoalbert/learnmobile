import { fireEvent, render, waitFor } from '@testing-library/react-native';

import DeleteAccountScreen from '../DeleteAccountScreen';

const mockFetch = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    replace: jest.fn(),
  }),
}));

jest.mock('@/common', () => ({ Header: () => null }));

describe('delete account request screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL = 'https://example.convex.site';
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true });
  });

  test('normalizes the email and asks the user to confirm through email', async () => {
    const screen = render(<DeleteAccountScreen />);

    fireEvent.changeText(screen.getByLabelText('Email'), '  SAM@Example.com ');
    fireEvent.press(screen.getByLabelText('Request Deletion'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.convex.site/request-account-deletion',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'sam@example.com' }),
        }),
      );
      expect(
        screen.getByText('Check sam@example.com for a confirmation link. The link expires in 30 minutes.'),
      ).toBeTruthy();
    });
  });

  test('reports a request failure without claiming that deletion was queued', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const screen = render(<DeleteAccountScreen />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'sam@example.com');
    fireEvent.press(screen.getByLabelText('Request Deletion'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again later.')).toBeTruthy();
    });
    expect(screen.queryByText(/confirmation link/)).toBeNull();
  });
});

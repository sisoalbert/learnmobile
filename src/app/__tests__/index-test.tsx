import { render, screen, waitFor } from '@testing-library/react-native';

import Index from '../index';
import {
  resolveStartupRouteState,
  StartupRouteProvider,
  type StartupRouteState,
} from '@/navigation/startup-route-context';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/screens/WelcomeScreen', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  const MockWelcomeScreen = () => mockReact.createElement(MockText, null, 'Welcome screen');
  MockWelcomeScreen.displayName = 'MockWelcomeScreen';
  return MockWelcomeScreen;
});

function renderIndex(startupRouteState: StartupRouteState) {
  return render(
    <StartupRouteProvider value={startupRouteState}>
      <Index />
    </StartupRouteProvider>,
  );
}

describe('initial route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows Welcome for an anonymous launch', () => {
    renderIndex({ status: 'anonymous' });

    expect(screen.getByText('Welcome screen')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('opens Home for an authenticated account that completed onboarding', async () => {
    renderIndex({ status: 'authenticated', onboardingCompleted: true });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });

  test('resumes onboarding for an authenticated account with incomplete onboarding', async () => {
    renderIndex({ status: 'authenticated', onboardingCompleted: false });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding'));
  });

  test('treats an account with no onboarding record as incomplete', () => {
    expect(resolveStartupRouteState({
      authLoading: false,
      authenticated: true,
      accountLoading: false,
      onboardingCompleted: false,
    })).toEqual({ status: 'authenticated', onboardingCompleted: false });
  });

  test('shows a loading state without navigating while authentication restores', () => {
    renderIndex({ status: 'loading' });

    expect(screen.getByLabelText('Restoring your account')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useLearnerSessionStore, type LearnerCredential } from '@/state/learner-session-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import { GuestSessionGate } from '../guest-session-gate';

const mockCaptureException = jest.fn();
const mockCreateGuestSession = jest.fn<Promise<LearnerCredential>, []>();
const mockMergeGuestProgress = jest.fn();
const mockUseQuery = jest.fn();

jest.mock('@sentry/react-native', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

jest.mock('convex/react', () => ({
  useAction: () => mockCreateGuestSession,
  useMutation: () => mockMergeGuestProgress,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

function renderGate(authenticated = false) {
  return render(
    <GuestSessionGate authenticated={authenticated} loading={false}>
      <Text>App ready</Text>
    </GuestSessionGate>,
  );
}

describe('guest session gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateGuestSession.mockResolvedValue({
      learnerId: 'guest-new',
      credential: 'new-secret',
    });
    mockMergeGuestProgress.mockResolvedValue({ merged: true });
    mockUseQuery.mockImplementation((_reference, args: LearnerCredential | 'skip') => {
      if (args === 'skip') return undefined;
      return { valid: args.learnerId !== 'guest-stale' };
    });
    useLearnerSessionStore.setState({
      hasHydrated: true,
      session: { learnerId: 'guest-valid', credential: 'valid-secret' },
    });
    useLessonResultsStore.setState({
      hasHydrated: true,
      lessonId: 'lesson-one',
      startedAt: 1_000,
      currentQuestionIndex: 2,
    });
  });

  test('mounts the app only after a stored guest credential is validated', () => {
    const screen = renderGate();

    expect(screen.getByText('App ready')).toBeTruthy();
    expect(mockCreateGuestSession).not.toHaveBeenCalled();
  });

  test('replaces a confirmed-invalid credential once and resets an in-progress lesson', async () => {
    useLearnerSessionStore.setState({
      session: { learnerId: 'guest-stale', credential: 'stale-secret' },
    });
    const screen = renderGate();

    await waitFor(() => expect(screen.getByText('App ready')).toBeTruthy());

    expect(mockCreateGuestSession).toHaveBeenCalledTimes(1);
    expect(useLearnerSessionStore.getState().session).toEqual({
      learnerId: 'guest-new',
      credential: 'new-secret',
    });
    expect(useLessonResultsStore.getState().startedAt).toBeNull();
    expect(useLessonResultsStore.getState().currentQuestionIndex).toBe(0);
  });

  test('keeps the old credential when replacement fails and allows an explicit retry', async () => {
    const failure = new Error('Network request failed');
    mockCreateGuestSession.mockRejectedValueOnce(failure);
    useLearnerSessionStore.setState({
      session: { learnerId: 'guest-stale', credential: 'stale-secret' },
    });
    const screen = renderGate();

    await waitFor(() => expect(screen.getByText('Unable to restore your session')).toBeTruthy());
    expect(useLearnerSessionStore.getState().session?.learnerId).toBe('guest-stale');
    expect(mockCaptureException).toHaveBeenCalledWith(failure, {
      tags: { area: 'learning', operation: 'replace_guest_session' },
      extra: { learnerId: 'guest-stale' },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('App ready')).toBeTruthy());
    expect(mockCreateGuestSession).toHaveBeenCalledTimes(2);
  });

  test('clears an unusable guest credential after authenticated merge validation fails', async () => {
    mockMergeGuestProgress.mockRejectedValueOnce(
      new Error('[CONVEX] INVALID_LEARNER_CREDENTIAL'),
    );
    renderGate(true);

    await waitFor(() => expect(useLearnerSessionStore.getState().session).toBeNull());
    expect(mockCreateGuestSession).not.toHaveBeenCalled();
  });
});

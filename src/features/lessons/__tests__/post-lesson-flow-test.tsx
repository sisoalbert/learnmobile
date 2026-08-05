import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLessonResultsStore, type LessonSummary } from '@/state/lesson-results-store';
import type { Id } from '../../../../convex/_generated/dataModel';
import {
  PostLessonAdScreen,
  PostLessonMonthlyQuestScreen,
  PostLessonPremiumScreen,
  PostLessonRewardScreen,
  PostLessonStreakDetailsScreen,
  PostLessonStreakIncreaseScreen,
  STREAK_INTRO_DURATION_MS,
} from '../post-lesson-screens';

const mockReplace = jest.fn();
const mockClaimReward = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useMutation: () => mockClaimReward,
}));

const completedAt = Date.parse('2026-08-03T12:00:00Z');
const summary: LessonSummary = {
  attemptId: 'attempt-id' as Id<'lessonAttempts'>,
  lessonId: 'beginner-course-1-lesson-1',
  score: 4,
  maximumScore: 4,
  earnedXp: 20,
  maximumXp: 20,
  accuracyPercent: 100,
  durationSeconds: 42,
  completedAt,
  heartsRemaining: 5,
  totalXp: 20,
  streakDays: 2,
  completedLessons: 1,
  nextLessonKey: 'beginner-course-1-lesson-2',
  weeklyActivityDateKeys: ['2026-08-03'],
  monthlyQuest: {
    monthKey: '2026-08',
    questPoints: 2,
    questTarget: 30,
    lessonsCompleted: 2,
    lessonsTarget: 2,
    highAccuracyLessons: 2,
    highAccuracyTarget: 3,
    streakExtensions: 1,
    streakTarget: 1,
  },
  reward: { questPointsEarned: 1, gemsAvailable: 12, claimed: false, totalGems: 8 },
};

describe('returning learner post-lesson flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClaimReward.mockResolvedValue({ gemsEarned: 12, totalGems: 20, alreadyClaimed: false });
    useLearnerSessionStore.setState({
      hasHydrated: true,
      session: { learnerId: 'guest-test', credential: 'guest-credential' },
    });
    useLessonResultsStore.setState({
      hasHydrated: true,
      latestSummary: summary,
      claimedReward: null,
    });
  });

  test('moves through ad and premium placeholders', () => {
    const ad = render(<PostLessonAdScreen />);
    fireEvent.press(ad.getByText('Continue'));
    expect(mockReplace).toHaveBeenCalledWith('/lessons/premium');

    const premium = render(<PostLessonPremiumScreen />);
    fireEvent.press(premium.getByText('Not now'));
    expect(mockReplace).toHaveBeenCalledWith('/lessons/streak-increase');
  });

  test('auto-advances from streak intro after the celebration', () => {
    jest.useFakeTimers();
    render(<PostLessonStreakIncreaseScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(STREAK_INTRO_DURATION_MS));
    expect(mockReplace).toHaveBeenCalledWith('/lessons/streak-details');
    jest.useRealTimers();
  });

  test('shows authoritative weekly activity and opens monthly quests', () => {
    const screen = render(<PostLessonStreakDetailsScreen />);

    expect(screen.getByText('2 days streak')).toBeTruthy();
    expect(screen.getByLabelText('Monday, completed')).toBeTruthy();
    fireEvent.press(screen.getByText('I’m doing it'));
    expect(mockReplace).toHaveBeenCalledWith('/lessons/monthly-quest');
  });

  test('claims the guest chest and stores the returned balance', async () => {
    const screen = render(<PostLessonMonthlyQuestScreen />);

    expect(screen.getAllByText('August Quest')).toHaveLength(2);
    expect(screen.getByText('2 / 30')).toBeTruthy();
    fireEvent.press(screen.getByText('Open Chest'));

    await waitFor(() => {
      expect(mockClaimReward).toHaveBeenCalledWith({
        learnerId: 'guest-test',
        credential: 'guest-credential',
        attemptId: 'attempt-id',
      });
      expect(useLessonResultsStore.getState().claimedReward).toEqual({
        gemsEarned: 12,
        totalGems: 20,
        alreadyClaimed: false,
      });
      expect(mockReplace).toHaveBeenCalledWith('/lessons/reward');
    });
  });

  test('keeps a failed chest claim available for retry', async () => {
    mockClaimReward.mockRejectedValueOnce(new Error('offline'));
    const screen = render(<PostLessonMonthlyQuestScreen />);

    fireEvent.press(screen.getByText('Open Chest'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unable to open your chest. Your reward is safe—please try again.',
      );
      expect(screen.getByText('Open Chest')).toBeTruthy();
    });
  });

  test('shows the claimed gems and clears the completed flow at Home', () => {
    useLessonResultsStore.setState({
      claimedReward: { gemsEarned: 12, totalGems: 20, alreadyClaimed: false },
    });
    const screen = render(<PostLessonRewardScreen />);

    expect(screen.getByText('+12 gems')).toBeTruthy();
    expect(screen.getByText('Balance: 20')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));

    expect(useLessonResultsStore.getState().latestSummary).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  test('guards direct access without a completed lesson', async () => {
    useLessonResultsStore.setState({ latestSummary: null });
    render(<PostLessonAdScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));
  });
});

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLearnerRewardsStore } from '@/state/learner-rewards-store';
import { useLessonResultsStore, type LessonSummary } from '@/state/lesson-results-store';
import { useSessionStore } from '@/state/sessionStore';
import type { Id } from '../../../../convex/_generated/dataModel';
import { feedback } from '@/services/feedback';
import { showInterstitialAd } from '@/services/ads';
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
let mockEndOfLessonAdsEnabled: boolean | undefined = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/services/ads', () => ({
  showInterstitialAd: jest.fn(() => Promise.resolve()),
  useEndOfLessonAdsEnabled: () => mockEndOfLessonAdsEnabled,
}));

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useMutation: () => mockClaimReward,
}));

const completedAt = Date.parse('2026-08-03T12:00:00Z');
const mockShowInterstitialAd = showInterstitialAd as jest.MockedFunction<typeof showInterstitialAd>;
const summary: LessonSummary = {
  attemptId: 'attempt-id' as Id<'lessonAttempts'>,
  lessonId: 'beginner-course-1-lesson-2',
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
  const feedbackPlay = jest.spyOn(feedback, 'play').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockEndOfLessonAdsEnabled = true;
    useSessionStore.getState().signOut();
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
    useLearnerRewardsStore.getState().resetRewards();
  });

  test('shows an interstitial and advances after it closes', async () => {
    render(<PostLessonAdScreen />);

    await waitFor(() => {
      expect(mockShowInterstitialAd).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/lessons/premium');
    });

    const premium = render(<PostLessonPremiumScreen />);
    fireEvent.press(premium.getByText('Not now'));
    expect(mockReplace).toHaveBeenCalledWith('/lessons/streak-increase');
  });

  test('continues when the interstitial fails to load', async () => {
    mockShowInterstitialAd.mockRejectedValueOnce(new Error('ad unavailable'));
    render(<PostLessonAdScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/lessons/premium'));
  });

  test('skips the interstitial when mobile ads are disabled', async () => {
    mockEndOfLessonAdsEnabled = false;
    render(<PostLessonAdScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/lessons/premium'));
    expect(mockShowInterstitialAd).not.toHaveBeenCalled();
  });

  test('waits for the mobile ads flag before starting the interstitial', async () => {
    mockEndOfLessonAdsEnabled = undefined;
    const screen = render(<PostLessonAdScreen />);

    await waitFor(() => expect(mockShowInterstitialAd).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();

    mockEndOfLessonAdsEnabled = true;
    screen.rerender(<PostLessonAdScreen />);

    await waitFor(() => {
      expect(mockShowInterstitialAd).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/lessons/premium');
    });
  });

  test('bypasses the interstitial for premium learners', async () => {
    useSessionStore.getState().setAuthenticatedUser({ id: 'premium-user', plan: 'premium' });
    render(<PostLessonAdScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/lessons/streak-increase'));
    expect(mockShowInterstitialAd).not.toHaveBeenCalled();
  });

  test('bypasses the interstitial when the first lesson ad route is opened directly', async () => {
    useLessonResultsStore.setState({
      latestSummary: { ...summary, lessonId: 'beginner-course-1-lesson-1' },
    });
    render(<PostLessonAdScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/lessons/premium'));
    expect(mockShowInterstitialAd).not.toHaveBeenCalled();
  });

  test('auto-advances from streak intro after the celebration', () => {
    jest.useFakeTimers();
    const screen = render(<PostLessonStreakIncreaseScreen />);
    screen.rerender(<PostLessonStreakIncreaseScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(feedbackPlay.mock.calls.filter(([event]) => event === 'streakIncrease')).toHaveLength(1);
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
      expect(useLearnerRewardsStore.getState().gems).toBe(20);
      expect(mockReplace).toHaveBeenCalledWith('/lessons/reward');
    });
  });

  test('keeps an idempotent claim at the server-returned balance', async () => {
    useLearnerRewardsStore.getState().setGemBalance(20);
    mockClaimReward.mockResolvedValueOnce({
      gemsEarned: 12,
      totalGems: 20,
      alreadyClaimed: true,
    });
    const screen = render(<PostLessonMonthlyQuestScreen />);

    fireEvent.press(screen.getByText('Open Chest'));

    await waitFor(() => {
      expect(useLearnerRewardsStore.getState().gems).toBe(20);
      expect(useLessonResultsStore.getState().claimedReward?.alreadyClaimed).toBe(true);
    });
  });

  test('keeps a failed chest claim available for retry', async () => {
    useLearnerRewardsStore.getState().setGemBalance(8);
    mockClaimReward.mockRejectedValueOnce(new Error('offline'));
    const screen = render(<PostLessonMonthlyQuestScreen />);

    fireEvent.press(screen.getByText('Open Chest'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unable to open your chest. Your reward is safe—please try again.',
      );
      expect(screen.getByText('Open Chest')).toBeTruthy();
      expect(useLearnerRewardsStore.getState().gems).toBe(8);
    });
  });

  test('returns home and invalidates a rejected guest session during reward claim', async () => {
    mockClaimReward.mockRejectedValueOnce(
      new Error('[CONVEX] INVALID_LEARNER_CREDENTIAL'),
    );
    const screen = render(<PostLessonMonthlyQuestScreen />);

    fireEvent.press(screen.getByText('Open Chest'));

    await waitFor(() => {
      expect(useLearnerSessionStore.getState().session).toBeNull();
      expect(useLessonResultsStore.getState().latestSummary).toBeNull();
      expect(mockReplace).toHaveBeenCalledWith('/home');
    });
  });

  test('shows the claimed gems, plays reward feedback once, and clears the flow at Home', () => {
    useLessonResultsStore.setState({
      claimedReward: { gemsEarned: 12, totalGems: 20, alreadyClaimed: false },
    });
    const screen = render(<PostLessonRewardScreen />);
    screen.rerender(<PostLessonRewardScreen />);

    expect(screen.getByText('+12 gems')).toBeTruthy();
    expect(screen.getByText('Balance: 20')).toBeTruthy();
    expect(useLearnerRewardsStore.getState().gems).toBe(20);
    expect(feedbackPlay.mock.calls.filter(([event]) => event === 'rewardEarned')).toHaveLength(1);
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

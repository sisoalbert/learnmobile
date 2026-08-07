import { act, fireEvent, render } from '@testing-library/react-native';

import LessonCompleteScreen, { CELEBRATION_DURATION_MS } from '../lesson-complete-screen';
import LessonResultsScreen from '../lesson-results-screen';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useOnboardingStore } from '@/state/onboarding-store';
import { useSessionStore } from '@/state/sessionStore';
import { feedback } from '@/services/feedback';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('lesson completion flow', () => {
  const feedbackPlay = jest.spyOn(feedback, 'play').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    useLessonResultsStore.setState({
      hasHydrated: true,
      latestSummary: {
        lessonId: 'first-lesson',
        score: 13,
        maximumScore: 14,
        earnedXp: 23,
        maximumXp: 85,
        accuracyPercent: 93,
        durationSeconds: 169,
        completedAt: 1_000,
      },
    });
    useOnboardingStore.setState({ hasHydrated: true, isCompleted: false });
    useLearningGoalStore.setState({ hasHydrated: true, isCommitted: false, selectedStreakGoal: null });
    useSessionStore.getState().signOut();
  });

  test('moves from the celebration to results automatically', () => {
    jest.useFakeTimers();
    render(<LessonCompleteScreen />);

    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(CELEBRATION_DURATION_MS);
    });

    expect(mockReplace).toHaveBeenCalledWith('/lessons/results');
    jest.useRealTimers();
  });

  test('keeps first-time learners in the learning goal flow', () => {
    const screen = render(<LessonResultsScreen />);

    expect(screen.getByText('Learning legend!')).toBeTruthy();
    expect(screen.getByText('23')).toBeTruthy();
    expect(screen.getByText('93%')).toBeTruthy();
    expect(screen.getByText('2:49')).toBeTruthy();
    screen.rerender(<LessonResultsScreen />);
    expect(feedbackPlay.mock.calls.filter(([event]) => event === 'lessonComplete')).toHaveLength(1);

    fireEvent.press(screen.getByText('Claim XP'));

    expect(mockReplace).toHaveBeenCalledWith('/learning-goal');
    expect(feedbackPlay).toHaveBeenCalledWith('buttonTap');
  });

  test('sends returning free learners into the ad flow', () => {
    useOnboardingStore.setState({ isCompleted: true });
    useLearningGoalStore.setState({ isCommitted: true, selectedStreakGoal: 5 });
    const screen = render(<LessonResultsScreen />);

    fireEvent.press(screen.getByText('Claim XP'));

    expect(mockReplace).toHaveBeenCalledWith('/lessons/ad');
  });

  test('lets returning premium learners skip monetization placeholders', () => {
    useOnboardingStore.setState({ isCompleted: true });
    useLearningGoalStore.setState({ isCommitted: true, selectedStreakGoal: 5 });
    useSessionStore.getState().setAuthenticatedUser({ id: 'premium-user', plan: 'premium' });
    const screen = render(<LessonResultsScreen />);

    fireEvent.press(screen.getByText('Claim XP'));

    expect(mockReplace).toHaveBeenCalledWith('/lessons/streak-increase');
  });
});

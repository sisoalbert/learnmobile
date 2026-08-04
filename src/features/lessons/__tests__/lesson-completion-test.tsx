import { act, fireEvent, render } from '@testing-library/react-native';

import LessonCompleteScreen, { CELEBRATION_DURATION_MS } from '../lesson-complete-screen';
import LessonResultsScreen from '../lesson-results-screen';
import { useLessonResultsStore } from '@/state/lesson-results-store';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('lesson completion flow', () => {
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

  test('continues from the results screen to the learning goal flow', () => {
    const screen = render(<LessonResultsScreen />);

    expect(screen.getByText('Learning legend!')).toBeTruthy();
    expect(screen.getByText('23')).toBeTruthy();
    expect(screen.getByText('93%')).toBeTruthy();
    expect(screen.getByText('2:49')).toBeTruthy();

    fireEvent.press(screen.getByText('Continue'));

    expect(mockReplace).toHaveBeenCalledWith('/learning-goal');
  });
});

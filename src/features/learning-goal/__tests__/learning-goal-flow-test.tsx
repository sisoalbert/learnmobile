import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LearningGoalFlowScreen from '../learning-goal-flow-screen';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('post-lesson learning goal flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLearningGoalStore.getState().resetGoal();
    useLessonResultsStore.setState({
      hasHydrated: true,
      latestSummary: {
        lessonId: 'beginner-course-1-lesson-1',
        score: 4,
        maximumScore: 4,
        earnedXp: 20,
        maximumXp: 20,
        accuracyPercent: 100,
        durationSeconds: 42,
        completedAt: Date.parse('2026-08-05T12:00:00Z'),
        streakDays: 1,
        weeklyActivityDateKeys: ['2026-08-05'],
      },
    });
  });

  function advanceToGoalSelection() {
    const screen = render(<LearningGoalFlowScreen />);

    fireEvent.press(screen.getByText('Continue'));
    fireEvent.press(screen.getByText('I’m committed'));
    fireEvent.press(screen.getByText('I’m committed'));

    return screen;
  }

  test('advances through the habit and streak introduction steps', () => {
    const screen = render(<LearningGoalFlowScreen />);

    expect(screen.getByText("Nice job! Now let's build a habit of practicing every day.")).toBeTruthy();

    fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('Can you practice every day?')).toBeTruthy();
    expect(screen.getByLabelText('1 day streak')).toBeTruthy();

    fireEvent.press(screen.getByText('I’m committed'));
    expect(screen.getByLabelText('Weekly streak tracker')).toBeTruthy();
    expect(screen.getByLabelText('Monday, not completed')).toBeTruthy();
    expect(screen.getByLabelText('Tuesday, not completed')).toBeTruthy();
    expect(screen.getByLabelText('Wednesday, completed')).toBeTruthy();
  });

  test('keeps commitment disabled until a goal is selected', () => {
    const screen = advanceToGoalSelection();
    const commitButton = screen.getByRole('button', { name: 'Commit to my goal' });

    expect(commitButton.props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(screen.getByLabelText('5 day streak goal, earn 500 gems'));

    expect(screen.getByText('Learners with a streak goal are more likely to finish their course!')).toBeTruthy();
    expect(screen.getByLabelText('5 day streak goal, earn 500 gems').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('button', { name: 'Commit to my goal' }).props.accessibilityState).toEqual({ disabled: false });
  });

  test.each([
    ['3 day streak goal, earn 30 gems'],
    ['5 day streak goal, earn 500 gems'],
    ['7 day streak goal, earn 700 gems'],
  ])('allows selecting %s', (goalLabel) => {
    const screen = advanceToGoalSelection();

    fireEvent.press(screen.getByLabelText(goalLabel));

    expect(screen.getByLabelText(goalLabel).props.accessibilityState).toEqual({ checked: true });
  });

  test('continues to the dedicated create-profile flow', () => {
    const screen = advanceToGoalSelection();
    fireEvent.press(screen.getByLabelText('5 day streak goal, earn 500 gems'));
    fireEvent.press(screen.getByText('Commit to my goal'));

    expect(mockReplace).toHaveBeenCalledWith('/create-profile');
    expect(useLearningGoalStore.getState()).toMatchObject({
      selectedStreakGoal: 5,
      isCommitted: true,
    });
  });

  test('returns to the first lesson when no authoritative completion exists', async () => {
    useLessonResultsStore.setState({ latestSummary: null });
    render(<LearningGoalFlowScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/lessons/first'));
  });
});

import { fireEvent, render } from '@testing-library/react-native';

import LearningGoalFlowScreen from '../learning-goal-flow-screen';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('post-lesson learning goal flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(screen.getByLabelText('Monday, completed')).toBeTruthy();
    expect(screen.getByLabelText('Tuesday, not completed')).toBeTruthy();
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

  test('routes profile actions to sign in and home', () => {
    const createProfileScreen = advanceToGoalSelection();
    fireEvent.press(createProfileScreen.getByLabelText('5 day streak goal, earn 500 gems'));
    fireEvent.press(createProfileScreen.getByText('Commit to my goal'));
    fireEvent.press(createProfileScreen.getByText('Create profile'));

    expect(mockReplace).toHaveBeenCalledWith('/signin');

    const laterScreen = advanceToGoalSelection();
    fireEvent.press(laterScreen.getByLabelText('3 day streak goal, earn 30 gems'));
    fireEvent.press(laterScreen.getByText('Commit to my goal'));
    fireEvent.press(laterScreen.getByText('Later'));

    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});

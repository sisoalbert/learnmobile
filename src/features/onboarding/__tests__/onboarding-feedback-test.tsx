import { fireEvent, render } from '@testing-library/react-native';

import { feedback } from '@/services/feedback';
import { useOnboardingStore } from '@/state/onboarding-store';
import OnboardingScreen from '@/screens/OnboardingScreen';
import { LEARNING_GOALS } from '../onboarding-content';
import { OnboardingShell, OptionList } from '../onboarding-components';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('onboarding feedback', () => {
  const feedbackPlay = jest.spyOn(feedback, 'play').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();
    useOnboardingStore.setState({ hasHydrated: true });
  });

  test('uses light semantic feedback for options and forward actions only', () => {
    const onBack = jest.fn();
    const onContinue = jest.fn();
    const onSelect = jest.fn();
    const screen = render(
      <OnboardingShell
        canGoBack
        ctaLabel="Continue"
        headerMode="progress"
        onBack={onBack}
        onContinue={onContinue}
        progress={0.25}
      >
        <OptionList options={LEARNING_GOALS} selected={null} onPress={onSelect} />
      </OnboardingShell>,
    );

    fireEvent.press(screen.getByText('Expo fundamentals'));
    expect(feedbackPlay).toHaveBeenCalledWith('optionSelected');
    expect(onSelect).toHaveBeenCalledWith('expo-fundamentals');

    fireEvent.press(screen.getByText('Continue'));
    expect(feedbackPlay).toHaveBeenCalledWith('buttonTap');
    expect(onContinue).toHaveBeenCalledTimes(1);

    feedbackPlay.mockClear();
    fireEvent.press(screen.getByLabelText('Go to previous onboarding step'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(feedbackPlay).not.toHaveBeenCalled();
  });

  test('celebrates the state transition that completes onboarding', () => {
    useOnboardingStore.setState({
      currentStepId: 'lesson-transition',
      isCompleted: false,
    });
    const screen = render(<OnboardingScreen />);

    fireEvent.press(screen.getByText('START LESSON 1'));

    expect(feedbackPlay).toHaveBeenCalledWith('onboardingComplete');
    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/lessons/first');
  });
});

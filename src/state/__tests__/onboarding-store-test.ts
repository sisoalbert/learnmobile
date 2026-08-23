import { useOnboardingStore } from '@/state/onboarding-store';

describe('account onboarding state', () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  test('clears stale completed onboarding when the restored account is incomplete', () => {
    useOnboardingStore.getState().completeOnboarding();

    useOnboardingStore.getState().markIncompleteFromAccount();

    expect(useOnboardingStore.getState()).toMatchObject({
      currentStepId: 'welcome',
      isCompleted: false,
    });
  });

  test('preserves locally persisted progress for an incomplete account', () => {
    useOnboardingStore.getState().setLearningGoal('expo-fundamentals');
    useOnboardingStore.getState().nextStep();

    useOnboardingStore.getState().markIncompleteFromAccount();

    expect(useOnboardingStore.getState()).toMatchObject({
      currentStepId: 'introduction',
      isCompleted: false,
      learningGoal: 'expo-fundamentals',
    });
  });
});

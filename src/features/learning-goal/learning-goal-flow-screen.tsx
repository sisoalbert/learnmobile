import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  DailyPracticePromptStep,
  HabitIntroductionStep,
  LearningGoalShell,
  StreakConfirmationStep,
  StreakGoalSelectionStep,
  type StreakGoal,
} from '@/features/learning-goal/learning-goal-components';

type FlowStep = 'habit' | 'practice' | 'confirmation' | 'goal' | 'goal-selected';

export default function LearningGoalFlowScreen() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('habit');
  const [selectedGoal, setSelectedGoal] = useState<StreakGoal | null>(null);

  if (step === 'habit') {
    return (
      <LearningGoalShell primaryLabel="Continue" onPrimaryPress={() => setStep('practice')}>
        <HabitIntroductionStep />
      </LearningGoalShell>
    );
  }

  if (step === 'practice') {
    return (
      <LearningGoalShell primaryLabel="I’m committed" onPrimaryPress={() => setStep('confirmation')}>
        <DailyPracticePromptStep />
      </LearningGoalShell>
    );
  }

  if (step === 'confirmation') {
    return (
      <LearningGoalShell primaryLabel="I’m committed" onPrimaryPress={() => setStep('goal')}>
        <StreakConfirmationStep />
      </LearningGoalShell>
    );
  }

  if (step === 'goal' || step === 'goal-selected') {
    return (
      <LearningGoalShell
        primaryDisabled={selectedGoal === null}
        primaryLabel="Commit to my goal"
        onPrimaryPress={() => router.replace('/create-profile' as never)}
      >
        <StreakGoalSelectionStep
          selectedGoal={selectedGoal}
          onSelectGoal={(goal) => {
            setSelectedGoal(goal);
            setStep('goal-selected');
          }}
        />
      </LearningGoalShell>
    );
  }

}

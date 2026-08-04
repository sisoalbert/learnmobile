import { useRouter } from 'expo-router';
import { useState } from 'react';

import {
  DailyPracticePromptStep,
  HabitIntroductionStep,
  LearningGoalShell,
  StreakConfirmationStep,
  StreakGoalSelectionStep,
} from '@/features/learning-goal/learning-goal-components';
import { useLearningGoalStore } from '@/state/learning-goal-store';

type FlowStep = 'habit' | 'practice' | 'confirmation' | 'goal' | 'goal-selected';

export default function LearningGoalFlowScreen() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('habit');
  const selectedGoal = useLearningGoalStore((state) => state.selectedStreakGoal);
  const selectStreakGoal = useLearningGoalStore((state) => state.selectStreakGoal);
  const commitGoal = useLearningGoalStore((state) => state.commitGoal);

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
        onPrimaryPress={() => {
          commitGoal();
          router.replace('/create-profile' as never);
        }}
      >
        <StreakGoalSelectionStep
          selectedGoal={selectedGoal}
          onSelectGoal={(goal) => {
            selectStreakGoal(goal);
            setStep('goal-selected');
          }}
        />
      </LearningGoalShell>
    );
  }

}

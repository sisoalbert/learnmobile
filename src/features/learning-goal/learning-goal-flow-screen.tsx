import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  DailyPracticePromptStep,
  HabitIntroductionStep,
  LearningGoalShell,
  StreakConfirmationStep,
  StreakGoalSelectionStep,
} from '@/features/learning-goal/learning-goal-components';
import { buildUtcWeekDays } from '@/features/lessons/utc-week';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';

type FlowStep = 'habit' | 'practice' | 'confirmation' | 'goal' | 'goal-selected';

export default function LearningGoalFlowScreen() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('habit');
  const selectedGoal = useLearningGoalStore((state) => state.selectedStreakGoal);
  const selectStreakGoal = useLearningGoalStore((state) => state.selectStreakGoal);
  const commitGoal = useLearningGoalStore((state) => state.commitGoal);
  const lessonResultsHydrated = useLessonResultsStore((state) => state.hasHydrated);
  const summary = useLessonResultsStore((state) => state.latestSummary);
  const weekDays = useMemo(
    () => summary
      ? buildUtcWeekDays(summary.completedAt, summary.weeklyActivityDateKeys ?? [])
      : [],
    [summary],
  );

  useEffect(() => {
    if (lessonResultsHydrated && !summary) router.replace('/lessons/first' as never);
  }, [lessonResultsHydrated, router, summary]);

  if (!lessonResultsHydrated || !summary) return null;
  const streakDays = summary.streakDays ?? 0;

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
        <DailyPracticePromptStep streakDays={streakDays} />
      </LearningGoalShell>
    );
  }

  if (step === 'confirmation') {
    return (
      <LearningGoalShell primaryLabel="I’m committed" onPrimaryPress={() => setStep('goal')}>
        <StreakConfirmationStep streakDays={streakDays} weekDays={weekDays} />
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

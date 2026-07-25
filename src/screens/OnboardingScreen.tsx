import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  CenteredStep,
  CourseCard,
  InfoCard,
  LoadingBar,
  NotificationCard,
  OnboardingShell,
  OptionList,
  ReminderChoice,
  RexLogo,
  SectionTitle,
  SpeechCard,
  SupportingText,
} from '@/features/onboarding/onboarding-components';
import {
  COURSE_CONTENT,
  DAILY_GOALS,
  EXPERIENCE_LEVELS,
  EXPO_EXPERIENCE_LEVELS,
  LEARNING_GOALS,
  LEARNING_PLANS,
  MOTIVATIONS,
  ONBOARDING_STEPS,
  OUTCOMES,
  STARTING_POINTS,
  type OnboardingRequiredAnswer,
} from '@/features/onboarding/onboarding-content';
import {
  getOnboardingStepIndex,
  getWeeklyLessonCount,
  useOnboardingStore,
  type OnboardingState,
} from '@/state/onboarding-store';
import { useSessionStore } from '@/state/sessionStore';

const hasRequiredAnswer = (
  requiredAnswer: OnboardingRequiredAnswer | undefined,
  state: OnboardingState,
) => {
  if (!requiredAnswer) return true;
  const answer = state[requiredAnswer];
  return Array.isArray(answer) ? answer.length > 0 : answer !== null;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const isLaunchingLesson = useRef(false);
  const state = useOnboardingStore();
  const continueAsGuest = useSessionStore((session) => session.continueAsGuest);
  const step = useMemo(
    () => ONBOARDING_STEPS.find((item) => item.id === state.currentStepId) ?? ONBOARDING_STEPS[0],
    [state.currentStepId],
  );
  const stepIndex = getOnboardingStepIndex(step.id);

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      state.previousStep();
    } else {
      router.replace('/welcome');
    }
  }, [router, state, stepIndex]);

  const handleContinue = useCallback(() => {
    if (step.id === 'lesson-transition') {
      isLaunchingLesson.current = true;
      continueAsGuest();
      state.completeOnboarding();
      router.replace('/lessons/first' as never);
      return;
    }
    state.nextStep();
  }, [continueAsGuest, router, state, step.id]);

  useEffect(() => {
    if (!state.hasHydrated) return;
    if (state.isCompleted && !isLaunchingLesson.current) router.replace('/home');
  }, [router, state.hasHydrated, state.isCompleted]);

  useEffect(() => {
    if (!state.hasHydrated || step.id !== 'course-preparation') return;
    const timer = setTimeout(state.nextStep, 2000);
    return () => clearTimeout(timer);
  }, [state.hasHydrated, state.nextStep, step.id]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]);

  if (!state.hasHydrated || state.isCompleted) return null;

  return (
    <OnboardingShell
      headerMode={step.headerMode}
      progress={step.progress}
      canGoBack={step.id !== 'course-preparation'}
      onBack={handleBack}
      ctaLabel={step.ctaLabel}
      ctaDisabled={!hasRequiredAnswer(step.requiredAnswer, state)}
      onContinue={handleContinue}
    >
      <StepContent stepId={step.id} title={step.title} body={step.body} state={state} />
    </OnboardingShell>
  );
}

function StepContent({
  stepId,
  title,
  body,
  state,
}: {
  stepId: OnboardingState['currentStepId'];
  title: string;
  body?: string;
  state: OnboardingState;
}) {
  switch (stepId) {
    case 'welcome':
    case 'introduction':
    case 'routine-introduction':
    case 'path-confirmation':
    case 'lesson-transition':
      return (
        <CenteredStep>
          <SpeechCard>{title}</SpeechCard>
          <RexLogo compact={stepId === 'path-confirmation'} />
          {body ? <SupportingText>{body}</SupportingText> : null}
        </CenteredStep>
      );
    case 'learning-goal':
      return <Question title={title} body={body}><OptionList options={LEARNING_GOALS} selected={state.learningGoal} onPress={state.setLearningGoal} /></Question>;
    case 'experience-level':
      return <Question title={title}><OptionList options={EXPERIENCE_LEVELS} selected={state.experienceLevel} onPress={state.setExperienceLevel} /></Question>;
    case 'course-preparation':
      return <CenteredStep><RexLogo /><SectionTitle>{title}</SectionTitle>{body ? <SupportingText>{body}</SupportingText> : null}<LoadingBar /></CenteredStep>;
    case 'expo-experience':
      return <Question title={title}><OptionList options={EXPO_EXPERIENCE_LEVELS} selected={state.expoExperience} onPress={state.setExpoExperience} /></Question>;
    case 'motivation':
      return <Question title={title} body={body}><OptionList options={MOTIVATIONS} selected={state.motivations} multiple onPress={state.toggleMotivation} /></Question>;
    case 'daily-goal':
      return <Question title={title} body={body}><OptionList options={DAILY_GOALS} selected={state.dailyGoalMinutes} onPress={state.setDailyGoalMinutes} /></Question>;
    case 'weekly-progress': {
      const lessons = getWeeklyLessonCount(state.dailyGoalMinutes);
      return <CenteredStep><SpeechCard>{title}</SpeechCard><RexLogo compact /><Text selectable style={styles.lessonCount}>{lessons} lessons per week</Text><SupportingText>At {state.dailyGoalMinutes ?? 10} minutes a day, you can complete about {lessons} lessons every week.</SupportingText></CenteredStep>;
    }
    case 'practice-reminders':
      return <CenteredStep style={styles.topAligned}><SectionTitle>{title}</SectionTitle>{body ? <SupportingText>{body}</SupportingText> : null}<NotificationCard><ReminderChoice value="disabled" label="Not now" selected={state.reminderPreference === 'disabled'} onPress={state.setReminderPreference} /><ReminderChoice value="enabled" label="Allow" selected={state.reminderPreference === 'enabled'} onPress={state.setReminderPreference} /></NotificationCard><SupportingText>This only saves your preference. You can change it later.</SupportingText></CenteredStep>;
    case 'three-month-outcome':
      return <Question title={title} body={body}><View style={styles.cardList}>{OUTCOMES.map((outcome) => <InfoCard key={outcome.title} {...outcome} />)}</View></Question>;
    case 'learning-plan':
      return <Question title={title}><OptionList options={LEARNING_PLANS} selected={state.learningPlan} onPress={state.setLearningPlan} /></Question>;
    case 'starting-point':
      return <Question title={title}><OptionList options={STARTING_POINTS} selected={state.startingPoint} onPress={state.setStartingPoint} /></Question>;
    case 'course-preview':
      return <Question title={title} body={body}><CourseCard items={COURSE_CONTENT} /></Question>;
  }
}

function Question({ title, body, children }: React.PropsWithChildren<{ title: string; body?: string }>) {
  return <View style={styles.question}><SectionTitle>{title}</SectionTitle>{body ? <SupportingText>{body}</SupportingText> : null}{children}</View>;
}

const styles = StyleSheet.create({
  question: { width: '100%', alignItems: 'center', gap: 18 },
  topAligned: { justifyContent: 'flex-start', paddingTop: 18 },
  cardList: { width: '100%', gap: 10 },
  lessonCount: { color: '#2289FD', fontSize: 30, fontWeight: '900', textAlign: 'center' },
});

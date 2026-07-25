import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const ONBOARDING_STEP_IDS = [
  'welcome',
  'introduction',
  'learning-goal',
  'experience-level',
  'course-preparation',
  'expo-experience',
  'motivation',
  'routine-introduction',
  'daily-goal',
  'weekly-progress',
  'practice-reminders',
  'three-month-outcome',
  'learning-plan',
  'starting-point',
  'path-confirmation',
  'course-preview',
  'lesson-transition',
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type LearningGoal =
  | 'react-native-fundamentals'
  | 'expo-fundamentals'
  | 'complete-apps'
  | 'improve-skills'
  | 'react-native-job';

export type ExperienceLevel =
  | 'completely-new'
  | 'javascript-typescript'
  | 'small-react-native-app'
  | 'regular-react-native-builder'
  | 'experienced-mobile-developer';

export type ExpoExperience =
  | 'never-used'
  | 'tried-expo-go'
  | 'built-expo-project'
  | 'used-eas'
  | 'professional';

export type Motivation =
  | 'own-app'
  | 'career'
  | 'mobile-development'
  | 'startup-product'
  | 'react-native-skills'
  | 'interview'
  | 'fun'
  | 'other';

export type DailyGoalMinutes = 5 | 10 | 15 | 20;
export type ReminderPreference = 'enabled' | 'disabled';
export type LearningPlan = 'guided' | 'self-directed';
export type StartingPoint = 'scratch' | 'assessment';

export type OnboardingState = {
  currentStepId: OnboardingStepId;
  isCompleted: boolean;
  hasHydrated: boolean;
  learningGoal: LearningGoal | null;
  experienceLevel: ExperienceLevel | null;
  expoExperience: ExpoExperience | null;
  motivations: Motivation[];
  dailyGoalMinutes: DailyGoalMinutes | null;
  reminderPreference: ReminderPreference | null;
  learningPlan: LearningPlan | null;
  startingPoint: StartingPoint | null;
  setLearningGoal: (value: LearningGoal) => void;
  setExperienceLevel: (value: ExperienceLevel) => void;
  setExpoExperience: (value: ExpoExperience) => void;
  toggleMotivation: (value: Motivation) => void;
  setDailyGoalMinutes: (value: DailyGoalMinutes) => void;
  setReminderPreference: (value: ReminderPreference) => void;
  setLearningPlan: (value: LearningPlan) => void;
  setStartingPoint: (value: StartingPoint) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
};

const initialProgress = {
  currentStepId: 'welcome' as OnboardingStepId,
  isCompleted: false,
  learningGoal: null,
  experienceLevel: null,
  expoExperience: null,
  motivations: [] as Motivation[],
  dailyGoalMinutes: null,
  reminderPreference: null,
  learningPlan: null,
  startingPoint: null,
};

export const getOnboardingStepIndex = (stepId: OnboardingStepId) =>
  ONBOARDING_STEP_IDS.indexOf(stepId);

export const getWeeklyLessonCount = (minutes: DailyGoalMinutes | null) => {
  const lessonCounts: Record<DailyGoalMinutes, number> = {
    5: 2,
    10: 3,
    15: 5,
    20: 7,
  };

  return minutes ? lessonCounts[minutes] : 3;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialProgress,
      hasHydrated: false,
      setLearningGoal: (learningGoal) => set({ learningGoal }),
      setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
      setExpoExperience: (expoExperience) => set({ expoExperience }),
      toggleMotivation: (motivation) =>
        set((state) => ({
          motivations: state.motivations.includes(motivation)
            ? state.motivations.filter((item) => item !== motivation)
            : [...state.motivations, motivation],
        })),
      setDailyGoalMinutes: (dailyGoalMinutes) => set({ dailyGoalMinutes }),
      setReminderPreference: (reminderPreference) => set({ reminderPreference }),
      setLearningPlan: (learningPlan) => set({ learningPlan }),
      setStartingPoint: (startingPoint) => set({ startingPoint }),
      nextStep: () => {
        const currentIndex = getOnboardingStepIndex(get().currentStepId);
        const nextStepId = ONBOARDING_STEP_IDS[currentIndex + 1];

        if (nextStepId) {
          set({ currentStepId: nextStepId });
        }
      },
      previousStep: () => {
        const currentIndex = getOnboardingStepIndex(get().currentStepId);
        const previousStepId = ONBOARDING_STEP_IDS[currentIndex - 1];

        if (previousStepId) {
          set({ currentStepId: previousStepId });
        }
      },
      completeOnboarding: () => set({ isCompleted: true, currentStepId: 'lesson-transition' }),
      resetOnboarding: () => set(initialProgress),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'learn-expo:onboarding',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStepId: state.currentStepId,
        isCompleted: state.isCompleted,
        learningGoal: state.learningGoal,
        experienceLevel: state.experienceLevel,
        expoExperience: state.expoExperience,
        motivations: state.motivations,
        dailyGoalMinutes: state.dailyGoalMinutes,
        reminderPreference: state.reminderPreference,
        learningPlan: state.learningPlan,
        startingPoint: state.startingPoint,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

import { useLearnerRewardsStore } from '@/state/learner-rewards-store';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import { useOnboardingStore } from '@/state/onboarding-store';
import { useSessionStore } from '@/state/sessionStore';
import { useUserProfileStore } from '@/state/user-profile-store';

export async function clearAllZustandStores() {
  useSessionStore.getState().signOut();
  useUserProfileStore.getState().resetProfile();
  useOnboardingStore.getState().resetOnboarding();
  useLearningGoalStore.getState().resetGoal();
  useLessonResultsStore.getState().resetLesson();
  useLearnerSessionStore.getState().clearSession();
  useLearnerRewardsStore.getState().resetRewards();

  await Promise.all([
    useUserProfileStore.persist.clearStorage(),
    useOnboardingStore.persist.clearStorage(),
    useLearningGoalStore.persist.clearStorage(),
    useLessonResultsStore.persist.clearStorage(),
    useLearnerSessionStore.persist.clearStorage(),
  ]);
}

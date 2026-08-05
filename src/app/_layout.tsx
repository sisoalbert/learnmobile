import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { ConvexReactClient, useAction, useMutation, useQuery } from 'convex/react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { authTokenStorage } from '@/auth/token-storage';
import { useSessionStore } from '@/state/sessionStore';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useOnboardingStore } from '@/state/onboarding-store';
import { useUserProfileStore } from '@/state/user-profile-store';
import { api } from '../../convex/_generated/api';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://35679436932e413d622d5a9e0b873249@o4511830907355136.ingest.us.sentry.io/4511830910697474',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

function RootLayout() {
  if (!convex) {
    return <AppNavigator />;
  }

  return (
    <ConvexAuthProvider client={convex} storage={authTokenStorage}>
      <AuthenticatedAppNavigator />
    </ConvexAuthProvider>
  );
}

export default Sentry.wrap(RootLayout);

function AuthenticatedAppNavigator() {
  const { isAuthenticated: convexAuthenticated, isLoading } = useConvexAuth();
  const setAuthenticatedUser = useSessionStore((state) => state.setAuthenticatedUser);
  const clearLocalSession = useSessionStore((state) => state.signOut);
  const hydrateProfile = useUserProfileStore((state) => state.hydrateProfile);
  const hydrateCommittedGoal = useLearningGoalStore((state) => state.hydrateCommittedGoal);
  const markOnboardingCompleted = useOnboardingStore((state) => state.markCompletedFromAccount);
  const currentUser = useQuery(
    api.users.current,
    !isLoading && convexAuthenticated ? {} : 'skip',
  );

  useLearningBootstrap({ authenticated: convexAuthenticated, loading: isLoading });

  useEffect(() => {
    if (isLoading) return;
    if (!convexAuthenticated) {
      clearLocalSession();
      return;
    }

    if (currentUser) {
      setAuthenticatedUser({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        age: currentUser.age,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        username: currentUser.username,
        plan: currentUser.plan,
      });
      hydrateProfile({
        age: currentUser.age ?? null,
        firstName: currentUser.firstName ?? '',
        lastName: currentUser.lastName ?? '',
        email: currentUser.email ?? '',
      });
      if (currentUser.onboarding?.completed) markOnboardingCompleted();
      if (currentUser.onboarding?.streakGoal) {
        hydrateCommittedGoal(currentUser.onboarding.streakGoal);
      }
    } else {
      setAuthenticatedUser({ id: 'convex-auth-user' });
    }
  }, [clearLocalSession, convexAuthenticated, currentUser, hydrateCommittedGoal, hydrateProfile, isLoading, markOnboardingCompleted, setAuthenticatedUser]);

  return <AppNavigator />;
}

function useLearningBootstrap({ authenticated, loading }: { authenticated: boolean; loading: boolean }) {
  const hasHydrated = useLearnerSessionStore((state) => state.hasHydrated);
  const learnerSession = useLearnerSessionStore((state) => state.session);
  const setLearnerSession = useLearnerSessionStore((state) => state.setSession);
  const clearLearnerSession = useLearnerSessionStore((state) => state.clearSession);
  const courses = useQuery(api.content.listPublishedCourses);
  const ensureSeeded = useMutation(api.content.ensureSeeded);
  const createGuestSession = useAction(api.learning.createGuestSession);
  const mergeGuestProgress = useMutation(api.learning.mergeGuestProgress);

  useEffect(() => {
    if (courses?.length === 0) void ensureSeeded({});
  }, [courses, ensureSeeded]);

  useEffect(() => {
    if (!hasHydrated || loading || authenticated || learnerSession) return;
    let active = true;
    void createGuestSession({}).then((created) => {
      if (active) setLearnerSession(created);
    });
    return () => { active = false; };
  }, [authenticated, createGuestSession, hasHydrated, learnerSession, loading, setLearnerSession]);

  useEffect(() => {
    if (!authenticated || !learnerSession) return;
    let active = true;
    void mergeGuestProgress(learnerSession).then(() => {
      if (active) clearLearnerSession();
    }).catch((error) => {
      Sentry.captureException(error, { tags: { area: 'learning', operation: 'merge_guest_progress' } });
    });
    return () => { active = false; };
  }, [authenticated, clearLearnerSession, learnerSession, mergeGuestProgress]);
}

function AppNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="learning-goal" />
        <Stack.Screen name="create-profile" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="home" />
        <Stack.Screen name="todo" />
        <Stack.Screen name="learning-paths" />
        <Stack.Screen name="courses/[courseKey]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="question-types" />

        <Stack.Screen name="signin" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </GestureHandlerRootView>
  );
}

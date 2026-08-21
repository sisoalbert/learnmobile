import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { authTokenStorage } from '@/auth/token-storage';
import { GuestSessionGate } from '@/features/learning-session/guest-session-gate';
import { feedback } from '@/services/feedback';
import {
  MobileAdsFeatureProvider,
  type MobileAdsFlags,
} from '@/services/ads';
import {
  usePushNotificationObserver,
} from '@/services/notifications/push-notification-manager';
import { usePracticeReminderContext } from '@/services/notifications/practice-reminder-context';
import { useSessionStore } from '@/state/sessionStore';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useOnboardingStore } from '@/state/onboarding-store';
import { useUserProfileStore } from '@/state/user-profile-store';
import { api } from '../../convex/_generated/api';
import * as Sentry from '@sentry/react-native';
import { AndroidSystemBar } from '@/common/android-system-bar';

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
    return <AppNavigator mobileAdsFlags={{ inLesson: false, endOfLesson: false }} />;
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
  const mobileAdsFlags = useQuery(api.featureFlags.getMobileAdsFlags);

  usePracticeReminderContext(Boolean(convexAuthenticated && currentUser), currentUser?.timezone);

  useContentBootstrap();

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

  return (
    <GuestSessionGate authenticated={convexAuthenticated} loading={isLoading}>
      <AppNavigator mobileAdsFlags={mobileAdsFlags} />
    </GuestSessionGate>
  );
}

function useContentBootstrap() {
  const courses = useQuery(api.content.listPublishedCourses);
  const ensureSeeded = useMutation(api.content.ensureSeeded);

  useEffect(() => {
    if (courses?.length === 0) void ensureSeeded({});
  }, [courses, ensureSeeded]);
}

function AppNavigator({ mobileAdsFlags }: { mobileAdsFlags?: MobileAdsFlags }) {
  usePushNotificationObserver();

  useEffect(() => {
    feedback.initialize();
    return () => feedback.dispose();
  }, []);

  return (
    <MobileAdsFeatureProvider flags={mobileAdsFlags}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AndroidSystemBar />
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
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="todo" />
            <Stack.Screen name="learning-paths" />
            <Stack.Screen name="courses/[courseKey]" />
            <Stack.Screen name="question-types" />

            <Stack.Screen name="signin" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="delete-account" />
          </Stack>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </MobileAdsFeatureProvider>
  );
}

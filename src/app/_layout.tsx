import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { authTokenStorage } from '@/auth/token-storage';
import { useSessionStore } from '@/state/sessionStore';
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
    return <AppNavigator convexAuthenticated={false} />;
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

  useEffect(() => {
    if (!isLoading && convexAuthenticated) {
      setAuthenticatedUser({ id: 'convex-auth-user' });
    }
  }, [convexAuthenticated, isLoading, setAuthenticatedUser]);

  return <AppNavigator convexAuthenticated={convexAuthenticated} />;
}

function AppNavigator({ convexAuthenticated }: { convexAuthenticated: boolean }) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const hasAuthenticatedSession = convexAuthenticated || isAuthenticated;

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
        <Stack.Screen name="profile" />
        <Stack.Screen name="question-types" />

        <Stack.Protected guard={!hasAuthenticatedSession}>
          <Stack.Screen name="signin" />
          <Stack.Screen name="signup" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}

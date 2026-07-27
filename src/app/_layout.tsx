import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { authTokenStorage } from '@/auth/token-storage';
import { useSessionStore } from '@/state/sessionStore';

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

export default function RootLayout() {
  if (!convex) {
    return <AppNavigator convexAuthenticated={false} />;
  }

  return (
    <ConvexAuthProvider client={convex} storage={authTokenStorage}>
      <AuthenticatedAppNavigator />
    </ConvexAuthProvider>
  );
}

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

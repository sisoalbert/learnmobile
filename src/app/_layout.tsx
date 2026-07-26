import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  const app = (
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

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="signin" />
          <Stack.Screen name="signup" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );

  return convex ? <ConvexProvider client={convex}>{app}</ConvexProvider> : app;
}

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useSessionStore } from '@/state/sessionStore';

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function RootLayout() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="home" />

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="signin" />
      </Stack.Protected>
    </Stack>
  );
}

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSessionStore } from '@/state/sessionStore';

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function RootLayout() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);

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
        <Stack.Screen name="home" />
        <Stack.Screen name="learning-paths" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="question-types" />

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="signin" />
        </Stack.Protected>
      </Stack>
    </GestureHandlerRootView>
  );
}

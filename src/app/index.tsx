import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useStartupRouteState } from '@/navigation/startup-route-context';
import WelcomeScreen from '@/screens/WelcomeScreen';

export default function Index() {
  const router = useRouter();
  const startupRouteState = useStartupRouteState();
  const destination = startupRouteState.status === 'authenticated'
    ? startupRouteState.onboardingCompleted ? '/home' : '/onboarding'
    : undefined;

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (startupRouteState.status === 'anonymous') return <WelcomeScreen />;

  return (
    <View accessibilityLabel="Restoring your account" style={styles.container}>
      <ActivityIndicator color="#2289FD" size="large" />
      <Text style={styles.message}>Restoring your account…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#F8FAFD',
  },
  message: {
    color: '#667085',
    fontSize: 15,
    fontWeight: '600',
  },
});

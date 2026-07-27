import { useAuthActions } from '@convex-dev/auth/react';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';
import WelcomeAnimation from '@/common/WelcomeAnimation';
import { useSessionStore } from '@/state/sessionStore';

export default function ProfileScreen({
  name,
  showSettings = false,
}: {
  name: string;
  showSettings?: boolean;
}) {
  const router = useRouter();
  const { signOut: signOutFromConvex } = useAuthActions();
  const clearLocalSession = useSessionStore((state) => state.signOut);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await signOutFromConvex();
      clearLocalSession();
      router.replace('/signin');
    } catch {
      Alert.alert('Unable to sign out', 'Please check your connection and try again.');
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header showSettings={showSettings} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <WelcomeAnimation />
        <Text selectable style={styles.title}>
          {name}
        </Text>
        <Link href="/todo" style={styles.link}>
          View Todos
        </Link>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={isSigningOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && !isSigningOut && styles.signOutButtonPressed,
            isSigningOut && styles.signOutButtonDisabled,
          ]}
          onPress={() => void handleSignOut()}
        >
          <Text style={styles.signOutText}>
            {isSigningOut ? 'Signing Out…' : 'Sign Out'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 56,
  },
  title: {
    color: '#4B4B4B',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: {
    marginTop: 16,
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signOutButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  signOutButtonPressed: {
    opacity: 0.8,
  },
  signOutButtonDisabled: {
    opacity: 0.55,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

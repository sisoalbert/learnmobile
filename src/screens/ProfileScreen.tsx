import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';
import { useSessionStore } from '@/state/sessionStore';
import { api } from '../../convex/_generated/api';

export default function ProfileScreen({
  showSettings = false,
}: {
  name: string;
  showSettings?: boolean;
}) {
  const router = useRouter();
  const { signOut: signOutFromConvex } = useAuthActions();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const user = useSessionStore((state) => state.user);
  const clearLocalSession = useSessionStore((state) => state.signOut);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : 'skip');

  const accountDescription =
    currentUser?.email ?? user?.email ?? currentUser?.name ?? user?.name ?? 'Signed in';

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
      <View style={styles.content}>
        <View style={styles.accountDetails}>
          <Text selectable style={styles.title}>
            {isAuthenticated ? 'User' : 'Guest'}
          </Text>
          <Text selectable style={styles.description}>
            {isAuthenticated ? accountDescription : 'not signed in'}
          </Text>
        </View>

        {isAuthenticated ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            disabled={isSigningOut}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && !isSigningOut && styles.actionButtonPressed,
              isSigningOut && styles.actionButtonDisabled,
            ]}
            onPress={() => void handleSignOut()}
          >
            <Text style={styles.actionText}>
              {isSigningOut ? 'signing out…' : 'sign out'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => router.push('/signin')}
          >
            <Text style={styles.actionText}>sign in</Text>
          </Pressable>
        )}
      </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 48,
    paddingBottom: 56,
  },
  accountDetails: {
    gap: 10,
  },
  title: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    color: '#000000',
    fontSize: 16,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionButtonPressed: {
    opacity: 0.6,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionText: {
    color: '#FF0000',
    fontSize: 16,
    textAlign: 'center',
  },
});

import { useAuthActions } from '@convex-dev/auth/react';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';
import { feedback } from '@/services/feedback';
import { disableStoredDevice } from '@/services/notifications/push-notification-manager';
import { clearAllZustandStores } from '@/state/clear-all-zustand-stores';
import { useSessionStore } from '@/state/sessionStore';
import { api } from '../../convex/_generated/api';

const DELETE_ACCOUNT_TITLE = 'Delete account?';
const DELETE_ACCOUNT_MESSAGE =
  'This permanently deletes your account and signs you out. This can’t be undone.';

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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : 'skip');
  const developmentDevices = useQuery(
    api.notifications.currentDevices,
    __DEV__ && isAuthenticated ? {} : 'skip',
  );
  const deleteCurrentUser = useMutation(api.users.deleteCurrent);
  const disableDevice = useMutation(api.notifications.disableDevice);
  const isAccountActionPending = isSigningOut || isDeletingAccount;

  const accountDescription =
    currentUser?.email ?? user?.email ?? currentUser?.name ?? user?.name ?? 'Signed in';
  const username = currentUser?.username ?? user?.username;
  const plan = currentUser?.plan ?? user?.plan ?? 'free';

  const handleSignOut = async () => {
    if (isAccountActionPending) return;

    feedback.play('buttonTap');
    setIsSigningOut(true);

    try {
      await disableStoredDevice(disableDevice);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'notifications',
          operation: 'disable_device_before_sign_out',
        },
      });
    }

    try {
      await signOutFromConvex();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'auth',
          operation: 'sign_out',
        },
      });
      Alert.alert('Unable to sign out', 'Please check your connection and try again.');
      setIsSigningOut(false);
      return;
    }

    try {
      await clearAllZustandStores();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'storage',
          operation: 'clear_after_sign_out',
        },
      });
    }

    router.replace('/signin');
  };

  const deleteAccount = async () => {
    if (isAccountActionPending) return;

    setIsDeletingAccount(true);

    try {
      await disableStoredDevice(disableDevice);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'notifications',
          operation: 'disable_device_before_account_delete',
        },
      });
    }

    try {
      await deleteCurrentUser({});
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'auth',
          operation: 'delete_account',
        },
      });
      Alert.alert('Unable to delete account', 'Please check your connection and try again.');
      setIsDeletingAccount(false);
      return;
    }

    try {
      await signOutFromConvex();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'auth',
          operation: 'sign_out_after_delete',
        },
      });
    }

    try {
      await clearAllZustandStores();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'storage',
          operation: 'clear_after_delete',
        },
      });
    }

    router.replace('/signin');
  };

  const handleDeleteAccount = () => {
    if (isAccountActionPending) return;

    feedback.play('buttonTap');
    if (Platform.OS === 'web') {
      if (window.confirm(`${DELETE_ACCOUNT_TITLE}\n\n${DELETE_ACCOUNT_MESSAGE}`)) {
        void deleteAccount();
      }
      return;
    }

    Alert.alert(
      DELETE_ACCOUNT_TITLE,
      DELETE_ACCOUNT_MESSAGE,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => void deleteAccount(),
        },
      ],
    );
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
          {isAuthenticated && username ? (
            <Text selectable style={styles.identityDetail}>
              @{username} · {plan} plan
            </Text>
          ) : null}
          {__DEV__ && isAuthenticated ? (
            <View style={styles.developmentPanel}>
              <Text style={styles.developmentTitle}>Expo push tokens · development</Text>
              {Array.isArray(developmentDevices) && developmentDevices.length > 0 ? (
                developmentDevices.map((device) => (
                  <View key={device.deviceId} style={styles.deviceToken}>
                    <Text style={styles.devicePlatform}>{device.platform}</Text>
                    <Text selectable style={styles.tokenText}>{device.expoPushToken}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyTokenText}>No active Expo push token</Text>
              )}
            </View>
          ) : null}
        </View>

        {isAuthenticated ? (
          <View style={styles.accountActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              disabled={isAccountActionPending}
              hitSlop={8}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && !isAccountActionPending && styles.actionButtonPressed,
                isAccountActionPending && styles.actionButtonDisabled,
              ]}
              onPress={() => void handleSignOut()}
            >
              <Text style={styles.actionText}>
                {isSigningOut ? 'signing out…' : 'sign out'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              disabled={isAccountActionPending}
              hitSlop={8}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && !isAccountActionPending && styles.actionButtonPressed,
                isAccountActionPending && styles.actionButtonDisabled,
              ]}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.actionText}>
                {isDeletingAccount ? 'deleting account…' : 'delete account'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => {
              feedback.play('buttonTap');
              router.push('/signin');
            }}
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
    flex: 1,
    gap: 10,
    paddingRight: 24,
  },
  accountActions: {
    alignItems: 'center',
    gap: 4,
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
  identityDetail: {
    color: '#666666',
    fontSize: 14,
    textTransform: 'lowercase',
  },
  developmentPanel: {
    maxWidth: 360,
    marginTop: 16,
    padding: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    backgroundColor: '#F7F7F7',
  },
  developmentTitle: {
    color: '#555555',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deviceToken: {
    gap: 4,
  },
  devicePlatform: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tokenText: {
    color: '#111111',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },
  emptyTokenText: {
    color: '#777777',
    fontSize: 12,
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

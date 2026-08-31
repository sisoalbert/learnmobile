import { useAuthActions } from '@convex-dev/auth/react';
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';
import { feedback } from '@/services/feedback';
import { disableStoredDevice } from '@/services/notifications/push-notification-manager';
import { isNativeRevenueCatPlatform, useRevenueCat } from '@/services/revenuecat';
import { clearAllZustandStores } from '@/state/clear-all-zustand-stores';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useSessionStore } from '@/state/sessionStore';
import { api } from '../../convex/_generated/api';

const DELETE_ACCOUNT_TITLE = 'Delete account?';
const DELETE_ACCOUNT_MESSAGE =
  'This permanently deletes your account and signs you out. This can’t be undone.';

export default function ProfileScreen({
  name,
  showSettings = false,
}: {
  name: string;
  showSettings?: boolean;
}) {
  const router = useRouter();
  const { signOut: signOutFromConvex } = useAuthActions();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const user = useSessionStore((state) => state.user);
  const learner = useLearnerSessionStore((state) => state.session);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : 'skip');
  const authenticatedProgress = useQuery(
    api.learning.getAuthenticatedProgress,
    isAuthenticated ? {} : 'skip',
  );
  const guestProgress = useQuery(
    api.learning.getGuestProgress,
    !isAuthenticated && learner ? learner : 'skip',
  );
  const developmentDevices = useQuery(
    api.notifications.currentDevices,
    __DEV__ && isAuthenticated ? {} : 'skip',
  );
  const deleteCurrentUser = useMutation(api.users.deleteCurrent);
  const disableDevice = useMutation(api.notifications.disableDevice);
  const isAccountActionPending = isSigningOut || isDeletingAccount;
  const learning = isAuthenticated ? authenticatedProgress : guestProgress;

  const accountDescription =
    currentUser?.email ?? user?.email ?? currentUser?.name ?? user?.name ?? 'Signed in';
  const username = currentUser?.username ?? user?.username;
  const plan = currentUser?.plan ?? user?.plan ?? 'free';
  const { hasPro, presentCustomerCenter, status: revenueCatStatus } = useRevenueCat();
  const isPro = hasPro || plan === 'premium';
  const fullName = [currentUser?.firstName ?? user?.firstName, currentUser?.lastName ?? user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const displayName = isAuthenticated
    ? fullName || currentUser?.name || user?.name || username || currentUser?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Learner'
    : 'Guest learner';
  const joinedYear = isAuthenticated && currentUser?.createdAt
    ? new Date(currentUser.createdAt).getFullYear()
    : undefined;
  const courseProgress = learning?.progress ?? [];
  const totalXp = courseProgress.reduce((total, progress) => total + progress.totalXp, 0);
  const completedLessons = courseProgress.reduce(
    (total, progress) => total + progress.completedLessons,
    0,
  );
  const stats = [
    { label: 'Day streak', value: learning?.streakDays ?? 0, icon: 'flame' as const, color: '#F28B19', background: '#FFF4E8' },
    { label: 'Total XP', value: totalXp, icon: 'zap' as const, color: '#E5A000', background: '#FFF8DE' },
    { label: 'Lessons', value: completedLessons, icon: 'book-open-check' as const, color: '#34A853', background: '#EAF8EE' },
    { label: 'Courses', value: courseProgress.length, icon: 'layers-3' as const, color: '#8757D8', background: '#F3EDFF' },
  ];

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

  const handleManageSubscription = async () => {
    if (isManagingSubscription) return;

    feedback.play('buttonTap');
    setIsManagingSubscription(true);
    const opened = await presentCustomerCenter();
    setIsManagingSubscription(false);
    if (!opened) {
      Alert.alert('Subscription management unavailable', 'Please try again in a moment.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header showBack={!showSettings} showSettings={showSettings} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text selectable style={styles.screenTitle}>{name}</Text>

        <View style={styles.profileGroup}>
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <Image
              accessibilityLabel="Rex profile illustration"
              contentFit="contain"
              source={require('../../assets/images/rex-profile.svg')}
              style={styles.rexImage}
            />
          </View>
          <View style={styles.identityCard}>
            <Text selectable style={styles.displayName}>{displayName}</Text>
            <View style={styles.identityMeta}>
              {isAuthenticated && username ? (
                <Text selectable style={styles.handle}>@{username}</Text>
              ) : null}
              {joinedYear ? (
                <Text selectable style={styles.joined}>Joined {joinedYear}</Text>
              ) : null}
            </View>
            {isAuthenticated ? (
              <View style={[styles.planBadge, isPro && styles.premiumBadge]}>
                <Lucide name={isPro ? 'crown' : 'sparkles'} size={14} color={isPro ? '#A66200' : '#356EBD'} />
                <Text selectable style={[styles.planText, isPro && styles.premiumText]}>{isPro ? 'premium' : 'free'} plan</Text>
              </View>
            ) : (
              <Text selectable style={styles.guestMessage}>Sign in to keep your learning progress synced.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text selectable style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat) => <ProfileStat key={stat.label} {...stat} />)}
          </View>
        </View>

        <View style={styles.section}>
          <Text selectable style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountCard}>
            {isAuthenticated ? (
              <>
                <View style={styles.accountIdentity}>
                  <Lucide name="mail" size={19} color="#718096" />
                  <Text selectable numberOfLines={1} style={styles.accountDescription}>{accountDescription}</Text>
                </View>
                <View style={styles.accountActions}>
                  {isPro && isNativeRevenueCatPlatform ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Manage subscription"
                      disabled={isManagingSubscription || revenueCatStatus !== 'ready'}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && !isManagingSubscription && styles.actionButtonPressed,
                        (isManagingSubscription || revenueCatStatus !== 'ready') && styles.actionButtonDisabled,
                      ]}
                      onPress={() => void handleManageSubscription()}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {isManagingSubscription ? 'Opening…' : 'Manage subscription'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                    disabled={isAccountActionPending}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && !isAccountActionPending && styles.actionButtonPressed,
                      isAccountActionPending && styles.actionButtonDisabled,
                    ]}
                    onPress={() => void handleSignOut()}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {isSigningOut ? 'Signing out…' : 'Sign out'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete account"
                    disabled={isAccountActionPending}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && !isAccountActionPending && styles.actionButtonPressed,
                      isAccountActionPending && styles.actionButtonDisabled,
                    ]}
                    onPress={handleDeleteAccount}
                  >
                    <Text style={styles.deleteButtonText}>
                      {isDeletingAccount ? 'Deleting account…' : 'Delete account'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                hitSlop={8}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                onPress={() => {
                  feedback.play('buttonTap');
                  router.push('/signin');
                }}
              >
                <Text style={styles.primaryButtonText}>Sign in</Text>
              </Pressable>
            )}
          </View>
        </View>

        {__DEV__ && isAuthenticated ? (
          <View style={styles.developmentPanel}>
            <Text selectable style={styles.developmentTitle}>Expo push tokens · development</Text>
            {Array.isArray(developmentDevices) && developmentDevices.length > 0 ? (
              developmentDevices.map((device) => (
                <View key={device.deviceId} style={styles.deviceToken}>
                  <Text selectable style={styles.devicePlatform}>{device.platform}</Text>
                  <Text selectable style={styles.tokenText}>{device.expoPushToken}</Text>
                </View>
              ))
            ) : (
              <Text selectable style={styles.emptyTokenText}>No active Expo push token</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileStat({
  label,
  value,
  icon,
  color,
  background,
}: {
  label: string;
  value: number;
  icon: LucideIconName;
  color: string;
  background: string;
}) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Lucide name={icon} size={21} color={color} />
      </View>
      <View style={styles.statCopy}>
        <Text selectable style={styles.statValue}>{value.toLocaleString('en-US')}</Text>
        <Text selectable style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    width: '100%',
    maxWidth: 660,
    alignSelf: 'center',
    gap: 24,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 44,
  },
  screenTitle: {
    color: '#17213B',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileGroup: {
    boxShadow: '0 8px 24px rgba(23,33,59,0.08)',
  },
  hero: {
    height: 210,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: '#DDF4FD',
  },
  heroGlow: {
    position: 'absolute',
    top: 26,
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: '#C7ECFB',
  },
  rexImage: {
    width: 240,
    height: 200,
  },
  identityCard: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  displayName: {
    color: '#17213B',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  identityMeta: {
    minHeight: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  handle: {
    color: '#687386',
    fontSize: 14,
    fontWeight: '700',
  },
  joined: {
    color: '#8A93A3',
    fontSize: 14,
    fontWeight: '600',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EAF3FF',
  },
  premiumBadge: {
    backgroundColor: '#FFF4D6',
  },
  planText: {
    color: '#356EBD',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  premiumText: {
    color: '#A66200',
  },
  guestMessage: {
    maxWidth: 300,
    color: '#718096',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#687386',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    minWidth: 145,
    minHeight: 92,
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5EAF1',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  statIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderCurve: 'continuous',
  },
  statCopy: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    color: '#17213B',
    fontSize: 21,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: '#7C8798',
    fontSize: 12,
    fontWeight: '700',
  },
  accountCard: {
    gap: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5EAF1',
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  accountIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountDescription: {
    flex: 1,
    color: '#465269',
    fontSize: 14,
    fontWeight: '600',
  },
  accountActions: {
    gap: 10,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D9E0EA',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#465269',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#D94755',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderCurve: 'continuous',
    backgroundColor: '#2289FD',
    boxShadow: '0 4px 0 #1A6ECE',
  },
  primaryButtonPressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  actionButtonPressed: {
    opacity: 0.62,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  developmentPanel: {
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9E0EA',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#F0F3F7',
  },
  developmentTitle: {
    color: '#5C6678',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  deviceToken: {
    gap: 4,
  },
  devicePlatform: {
    color: '#687386',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tokenText: {
    color: '#17213B',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
  },
  emptyTokenText: {
    color: '#7C8798',
    fontSize: 12,
  },
});

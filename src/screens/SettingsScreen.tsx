import React, { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import * as Sentry from '@sentry/react-native';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import * as Updates from 'expo-updates';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Lucide } from '@react-native-vector-icons/lucide';

import { Header } from '@/common';
import { useOnboardingStore } from '@/state/onboarding-store';
import { feedback, useFeedbackPreferencesStore } from '@/services/feedback';
import {
  disableStoredDevice,
  synchronizeStoredDevice,
} from '@/services/notifications/push-notification-manager';
import { clearAllZustandStores } from '@/state/clear-all-zustand-stores';
import { api } from '../../convex/_generated/api';

export default function SettingsScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const { isAuthenticated } = useConvexAuth();
  const { signOut: signOutFromConvex } = useAuthActions();
  const disableDevice = useMutation(api.notifications.disableDevice);
  const registerDevice = useMutation(api.notifications.registerDevice);
  const updatePracticeReminders = useMutation(api.users.updatePracticeReminders);
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : 'skip');
  const soundEffectsEnabled = useFeedbackPreferencesStore(
    (state) => state.soundEffectsEnabled,
  );
  const hapticFeedbackEnabled = useFeedbackPreferencesStore(
    (state) => state.hapticFeedbackEnabled,
  );
  const setSoundEffectsEnabled = useFeedbackPreferencesStore(
    (state) => state.setSoundEffectsEnabled,
  );
  const setHapticFeedbackEnabled = useFeedbackPreferencesStore(
    (state) => state.setHapticFeedbackEnabled,
  );
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [isUpdatingReminders, setIsUpdatingReminders] = useState(false);
  const practiceRemindersEnabled = currentUser?.onboarding?.reminderPreference === 'enabled';

  const handleReset = async () => {
    feedback.play('buttonTap');

    if (isAuthenticated) {
      try {
        await disableStoredDevice(disableDevice);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: 'notifications',
            operation: 'disable_device_before_reset',
          },
        });
      }

      try {
        await signOutFromConvex();
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: 'auth',
            operation: 'sign_out_on_reset',
          },
        });
      }
    }

    try {
      await clearAllZustandStores();
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'storage',
          operation: 'clear_stores_on_reset',
        },
      });
    }

    router.replace('/');
  };

  const handleSoundEffectsChange = (enabled: boolean) => {
    if (enabled) {
      setSoundEffectsEnabled(true);
      feedback.play('buttonTap');
      return;
    }
    feedback.play('buttonTap');
    setSoundEffectsEnabled(false);
  };

  const handleHapticFeedbackChange = (enabled: boolean) => {
    if (enabled) {
      setHapticFeedbackEnabled(true);
      feedback.play('buttonTap');
      return;
    }
    feedback.play('buttonTap');
    setHapticFeedbackEnabled(false);
  };

  const handlePracticeRemindersChange = async (enabled: boolean) => {
    if (!isAuthenticated || isUpdatingReminders) return;
    feedback.play('buttonTap');
    setIsUpdatingReminders(true);
    try {
      await updatePracticeReminders({ enabled });
      onboarding.setReminderPreference(enabled ? 'enabled' : 'disabled');
      if (enabled) {
        await synchronizeStoredDevice(registerDevice, disableDevice);
      } else {
        await disableStoredDevice(disableDevice);
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: 'notifications', operation: 'update_practice_reminders' },
      });
      Alert.alert('Unable to update reminders', 'Please check your connection and try again.');
    } finally {
      setIsUpdatingReminders(false);
    }
  };

  const handleCheckForUpdates = async () => {
    feedback.play('buttonTap');
    if (!Updates.isEnabled) {
      Alert.alert(
        'Updates unavailable',
        'OTA updates are available in preview and production builds.',
      );
      return;
    }

    setIsCheckingForUpdate(true);

    try {
      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        Alert.alert('Up to date', 'You already have the latest available update.');
        return;
      }

      await Updates.fetchUpdateAsync();
      Alert.alert('Update ready', 'Restart Learn Expo to apply the update.', [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Restart now',
          onPress: () => {
            void Updates.reloadAsync();
          },
        },
      ]);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          area: 'updates',
          operation: 'check_for_update',
        },
      });
      Alert.alert('Unable to check for updates', 'Please check your connection and try again.');
    } finally {
      setIsCheckingForUpdate(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header onBack={() => router.replace('/profile')} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            <View style={styles.heading}>
              <Text selectable style={styles.title}>
                Settings
              </Text>
              <Text selectable style={styles.description}>
                Manage your app preferences.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="View onboarding selections"
              accessibilityRole="button"
              onPress={() => router.push('/settings/onboarding')}
              style={({ pressed }) => [styles.onboardingLink, pressed && styles.onboardingLinkPressed]}
            >
              <View style={styles.onboardingLinkCopy}>
                <Text selectable style={styles.onboardingLinkTitle}>Onboarding selections</Text>
                <Text selectable style={styles.onboardingLinkDescription}>
                  Review the goals and preferences you chose when getting started.
                </Text>
              </View>
              <Lucide name="chevron-right" size={22} color="#737373" />
            </Pressable>
          </>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.preferencesSection}>
              <View style={styles.updateHeading}>
                <Text selectable style={styles.updateTitle}>
                  Feedback
                </Text>
                <Text selectable style={styles.updateDescription}>
                  Choose how Learn Expo responds to your interactions.
                </Text>
              </View>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceCopy}>
                  <Text nativeID="practice-reminders-label" selectable style={styles.preferenceLabel}>
                    Practice reminders
                  </Text>
                  <Text selectable style={styles.preferenceDescription}>
                    Get push and email reminders when your learning streak is at risk.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Practice reminders"
                  accessibilityState={{ checked: practiceRemindersEnabled }}
                  disabled={!isAuthenticated || currentUser === undefined || isUpdatingReminders}
                  onValueChange={(enabled) => void handlePracticeRemindersChange(enabled)}
                  trackColor={{ false: '#C9CDD5', true: '#8BCBEE' }}
                  thumbColor={practiceRemindersEnabled ? '#1899D6' : '#FFFFFF'}
                  value={practiceRemindersEnabled}
                />
              </View>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceCopy}>
                  <Text nativeID="sound-effects-label" selectable style={styles.preferenceLabel}>
                    Sound effects
                  </Text>
                  <Text selectable style={styles.preferenceDescription}>
                    Play taps, answer cues, and celebrations.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Sound effects"
                  accessibilityState={{ checked: soundEffectsEnabled }}
                  onValueChange={handleSoundEffectsChange}
                  trackColor={{ false: '#C9CDD5', true: '#8BCBEE' }}
                  thumbColor={soundEffectsEnabled ? '#1899D6' : '#FFFFFF'}
                  value={soundEffectsEnabled}
                />
              </View>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceCopy}>
                  <Text nativeID="haptic-feedback-label" selectable style={styles.preferenceLabel}>
                    Haptic feedback
                  </Text>
                  <Text selectable style={styles.preferenceDescription}>
                    Use supported device vibration and haptics.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Haptic feedback"
                  accessibilityState={{ checked: hapticFeedbackEnabled }}
                  onValueChange={handleHapticFeedbackChange}
                  trackColor={{ false: '#C9CDD5', true: '#8BCBEE' }}
                  thumbColor={hapticFeedbackEnabled ? '#1899D6' : '#FFFFFF'}
                  value={hapticFeedbackEnabled}
                />
              </View>
            </View>
            <View style={styles.updateSection}>
              <View style={styles.updateHeading}>
                <Text selectable style={styles.updateTitle}>
                  App updates
                </Text>
                <Text selectable style={styles.updateDescription}>
                  {Updates.isEnabled
                    ? `Channel ${Updates.channel ?? 'unassigned'} · Runtime ${Updates.runtimeVersion ?? 'unknown'}`
                    : 'Available in preview and production builds.'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check for app updates"
                disabled={isCheckingForUpdate}
                onPress={() => void handleCheckForUpdates()}
                style={({ pressed }) => [
                  styles.updateButton,
                  pressed && !isCheckingForUpdate && styles.updateButtonPressed,
                  isCheckingForUpdate && styles.updateButtonDisabled,
                ]}
              >
                <Lucide name="refresh-cw" size={19} color="#1899D6" />
                <Text style={styles.updateButtonText}>
                  {isCheckingForUpdate ? 'CHECKING…' : 'CHECK FOR UPDATES'}
                </Text>
              </Pressable>
            </View>
            {onboarding.hasHydrated ? (
              <View style={styles.resetSection}>
                <Text selectable style={styles.resetDescription}>
                  This will clear all local data, sign you out, and return you to the Welcome screen.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset onboarding data"
                  onPress={() => void handleReset()}
                  style={({ pressed }) => [
                    styles.resetButton,
                    pressed && styles.resetButtonPressed,
                  ]}
                >
                  <Lucide name="rotate-ccw" size={19} color="#D64545" />
                  <Text style={styles.resetButtonText}>RESET ONBOARDING</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.content}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  heading: {
    gap: 6,
    paddingBottom: 24,
  },
  title: {
    color: '#2D2D2D',
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: '#737373',
    fontSize: 15,
  },
  onboardingLink: {
    width: '100%',
    minHeight: 88,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E2E2',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  onboardingLinkPressed: {
    opacity: 0.72,
  },
  onboardingLinkCopy: {
    flex: 1,
    gap: 4,
  },
  onboardingLinkTitle: {
    color: '#2D2D2D',
    fontSize: 16,
    fontWeight: '800',
  },
  onboardingLinkDescription: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    gap: 28,
    paddingTop: 28,
  },
  updateSection: {
    gap: 12,
  },
  preferencesSection: {
    gap: 14,
  },
  preferenceRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    paddingVertical: 8,
  },
  preferenceCopy: {
    flex: 1,
    gap: 4,
  },
  preferenceLabel: {
    color: '#2D2D2D',
    fontSize: 16,
    fontWeight: '700',
  },
  preferenceDescription: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
  },
  updateHeading: {
    gap: 5,
  },
  updateTitle: {
    color: '#2D2D2D',
    fontSize: 17,
    fontWeight: '800',
  },
  updateDescription: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 19,
  },
  updateButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#1899D6',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#F2FAFF',
  },
  updateButtonPressed: {
    opacity: 0.68,
  },
  updateButtonDisabled: {
    opacity: 0.55,
  },
  updateButtonText: {
    color: '#1899D6',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resetSection: {
    gap: 12,
  },
  resetDescription: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  resetButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#D64545',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFF7F7',
  },
  resetButtonPressed: {
    opacity: 0.68,
  },
  resetButtonText: {
    color: '#D64545',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

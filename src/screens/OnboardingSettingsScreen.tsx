import { useAuthActions } from '@convex-dev/auth/react';
import * as Sentry from '@sentry/react-native';
import { useMemo } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lucide } from '@react-native-vector-icons/lucide';

import { Header } from '@/common';
import {
  DAILY_GOALS,
  EXPERIENCE_LEVELS,
  EXPO_EXPERIENCE_LEVELS,
  LEARNING_GOALS,
  LEARNING_PLANS,
  MOTIVATIONS,
  STARTING_POINTS,
} from '@/features/onboarding/onboarding-content';
import { useOnboardingStore } from '@/state/onboarding-store';
import { feedback } from '@/services/feedback';
import { disableStoredDevice } from '@/services/notifications/push-notification-manager';
import { clearAllZustandStores } from '@/state/clear-all-zustand-stores';
import { api } from '../../convex/_generated/api';

type SelectionItem = {
  id: string;
  label: string;
  value: string;
};

const findLabel = <T extends string | number>(
  options: { value: T; label: string }[],
  value: T | null,
) => options.find((option) => option.value === value)?.label ?? 'Not selected';

export default function OnboardingSettingsScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const { isAuthenticated } = useConvexAuth();
  const { signOut: signOutFromConvex } = useAuthActions();
  const disableDevice = useMutation(api.notifications.disableDevice);
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : 'skip');
  const savedOnboarding = isAuthenticated ? currentUser?.onboarding : onboarding;
  const isLoading = !onboarding.hasHydrated || (isAuthenticated && currentUser === undefined);
  const showResetOnboarding = onboarding.hasHydrated && (!isAuthenticated || __DEV__);

  const handleReset = async () => {
    feedback.play('buttonTap');

    if (isAuthenticated) {
      try {
        await disableStoredDevice(disableDevice);
      } catch (error) {
        Sentry.captureException(error, {
          tags: { area: 'notifications', operation: 'disable_device_before_reset' },
        });
      }

      try {
        await signOutFromConvex();
      } catch (error) {
        Sentry.captureException(error, {
          tags: { area: 'auth', operation: 'sign_out_on_reset' },
        });
      }
    }

    try {
      await clearAllZustandStores();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: 'storage', operation: 'clear_stores_on_reset' },
      });
    }

    router.replace('/');
  };
  const selections = useMemo<SelectionItem[]>(() => {
    if (!savedOnboarding) return [];

    const motivationLabels = (savedOnboarding.motivations ?? []).map(
      (motivation) =>
        MOTIVATIONS.find((option) => option.value === motivation)?.label ?? motivation,
    );

    return [
      { id: 'learning-goal', label: 'Learning goal', value: findLabel(LEARNING_GOALS, savedOnboarding.learningGoal ?? null) },
      { id: 'react-native-experience', label: 'React Native experience', value: findLabel(EXPERIENCE_LEVELS, savedOnboarding.experienceLevel ?? null) },
      { id: 'expo-experience', label: 'Expo experience', value: findLabel(EXPO_EXPERIENCE_LEVELS, savedOnboarding.expoExperience ?? null) },
      { id: 'motivations', label: 'Motivations', value: motivationLabels.length > 0 ? motivationLabels.join(', ') : 'Not selected' },
      { id: 'daily-goal', label: 'Daily goal', value: findLabel(DAILY_GOALS, savedOnboarding.dailyGoalMinutes ?? null) },
      {
        id: 'practice-reminders',
        label: 'Practice reminders',
        value: savedOnboarding.reminderPreference === 'enabled'
          ? 'Enabled'
          : savedOnboarding.reminderPreference === 'disabled'
            ? 'Disabled'
            : 'Not selected',
      },
      { id: 'learning-plan', label: 'Learning plan', value: findLabel(LEARNING_PLANS, savedOnboarding.learningPlan ?? null) },
      { id: 'starting-point', label: 'Starting point', value: findLabel(STARTING_POINTS, savedOnboarding.startingPoint ?? null) },
    ];
  }, [
    savedOnboarding,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header onBack={() => router.replace('/settings')} />
      <FlatList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={isLoading ? [] : selections}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text selectable style={styles.loadingText}>
            {isLoading ? 'Loading saved selections…' : 'No saved onboarding selections.'}
          </Text>
        }
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text selectable style={styles.title}>Onboarding selections</Text>
            <Text selectable style={styles.description}>
              Your saved goals, experience, and learning preferences.
            </Text>
          </View>
        }
        ListFooterComponent={showResetOnboarding ? (
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
        renderItem={({ item }) => (
          <View style={styles.selectionCard}>
            <Text selectable style={styles.selectionLabel}>{item.label}</Text>
            <Text selectable style={styles.selectionValue}>{item.value}</Text>
          </View>
        )}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  heading: { gap: 6, paddingBottom: 24 },
  title: { color: '#2D2D2D', fontSize: 28, fontWeight: '800' },
  description: { color: '#737373', fontSize: 15 },
  selectionCard: { gap: 7, padding: 16, borderWidth: 1.5, borderColor: '#E2E2E2', borderRadius: 14, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  selectionLabel: { color: '#737373', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  selectionValue: { color: '#2D2D2D', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  separator: { height: 10 },
  loadingText: { color: '#737373', fontSize: 15, textAlign: 'center' },
  resetSection: { gap: 12, paddingTop: 28 },
  resetDescription: { color: '#737373', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  resetButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1.5, borderColor: '#D64545', borderRadius: 14, borderCurve: 'continuous', backgroundColor: '#FFF7F7' },
  resetButtonPressed: { opacity: 0.68 },
  resetButtonText: { color: '#D64545', fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
});

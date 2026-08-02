import React, { useMemo, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

type SelectionItem = {
  id: string;
  label: string;
  value: string;
};

const findLabel = <T extends string | number>(
  options: { value: T; label: string }[],
  value: T | null,
) => options.find((option) => option.value === value)?.label ?? 'Not selected';

export default function SettingsScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);

  const handleReset = () => {
    onboarding.resetOnboarding();
    router.replace('/');
  };

  const handleCheckForUpdates = async () => {
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

  const selections = useMemo<SelectionItem[]>(() => {
    const motivationLabels = onboarding.motivations.map(
      (motivation) =>
        MOTIVATIONS.find((option) => option.value === motivation)?.label ?? motivation,
    );

    return [
      {
        id: 'learning-goal',
        label: 'Learning goal',
        value: findLabel(LEARNING_GOALS, onboarding.learningGoal),
      },
      {
        id: 'react-native-experience',
        label: 'React Native experience',
        value: findLabel(EXPERIENCE_LEVELS, onboarding.experienceLevel),
      },
      {
        id: 'expo-experience',
        label: 'Expo experience',
        value: findLabel(EXPO_EXPERIENCE_LEVELS, onboarding.expoExperience),
      },
      {
        id: 'motivations',
        label: 'Motivations',
        value: motivationLabels.length > 0 ? motivationLabels.join(', ') : 'Not selected',
      },
      {
        id: 'daily-goal',
        label: 'Daily goal',
        value: findLabel(DAILY_GOALS, onboarding.dailyGoalMinutes),
      },
      {
        id: 'practice-reminders',
        label: 'Practice reminders',
        value:
          onboarding.reminderPreference === 'enabled'
            ? 'Enabled'
            : onboarding.reminderPreference === 'disabled'
              ? 'Disabled'
              : 'Not selected',
      },
      {
        id: 'learning-plan',
        label: 'Learning plan',
        value: findLabel(LEARNING_PLANS, onboarding.learningPlan),
      },
      {
        id: 'starting-point',
        label: 'Starting point',
        value: findLabel(STARTING_POINTS, onboarding.startingPoint),
      },
    ];
  }, [
    onboarding.dailyGoalMinutes,
    onboarding.experienceLevel,
    onboarding.expoExperience,
    onboarding.learningGoal,
    onboarding.learningPlan,
    onboarding.motivations,
    onboarding.reminderPreference,
    onboarding.startingPoint,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={onboarding.hasHydrated ? selections : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.selectionCard}>
            <Text selectable style={styles.selectionLabel}>
              {item.label}
            </Text>
            <Text selectable style={styles.selectionValue}>
              {item.value}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text selectable style={styles.title}>
              Settings
            </Text>
            <Text selectable style={styles.description}>
              Your saved onboarding selections
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text selectable style={styles.loadingText}>
            Loading saved selections…
          </Text>
        }
        ListFooterComponent={
          <View style={styles.footer}>
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
                  This will clear your onboarding data and return you to the Welcome screen.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset onboarding data"
                  onPress={handleReset}
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
  selectionCard: {
    gap: 7,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E2E2',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  selectionLabel: {
    color: '#737373',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectionValue: {
    color: '#2D2D2D',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  separator: {
    height: 10,
  },
  loadingText: {
    color: '#737373',
    fontSize: 15,
    textAlign: 'center',
  },
  footer: {
    gap: 28,
    paddingTop: 28,
  },
  updateSection: {
    gap: 12,
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

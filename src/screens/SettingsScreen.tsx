import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

  const handleReset = () => {
    onboarding.resetOnboarding();
    router.replace('/');
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
          onboarding.hasHydrated ? (
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
          ) : null
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
  resetSection: {
    gap: 12,
    paddingTop: 28,
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

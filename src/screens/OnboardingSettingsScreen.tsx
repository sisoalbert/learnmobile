import { useMemo } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : 'skip');
  const savedOnboarding = isAuthenticated ? currentUser?.onboarding : onboarding;
  const isLoading = !onboarding.hasHydrated || (isAuthenticated && currentUser === undefined);
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
});

import { Image } from 'expo-image';
import { useConvexAuth, useQuery } from 'convex/react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../convex/_generated/api';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import { QuestProgressCard } from './quest-progress-card';

type MonthlyQuest = {
  monthKey: string;
  questPoints: number;
  questTarget: number;
  lessonsCompleted: number;
  lessonsTarget: number;
  highAccuracyLessons: number;
  highAccuracyTarget: number;
  streakExtensions: number;
  streakTarget: number;
};

export default function QuestsScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const learner = useLearnerSessionStore((state) => state.session);
  const learnerHydrated = useLearnerSessionStore((state) => state.hasHydrated);
  const latestQuest = useLessonResultsStore((state) => state.latestSummary?.monthlyQuest);
  const authenticatedProgress = useQuery(api.learning.getAuthenticatedProgress, isAuthenticated ? {} : 'skip');
  const guestProgress = useQuery(api.learning.getGuestProgress, !isAuthenticated && learner ? learner : 'skip');
  const learning = isAuthenticated ? authenticatedProgress : guestProgress;

  if (authLoading || (!isAuthenticated && !learnerHydrated) || !learning) {
    return <QuestMessage loading message="Restoring your quests…" />;
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const quest = learning.monthlyQuest as MonthlyQuest | undefined
    ?? (latestQuest?.monthKey === monthKey ? latestQuest : undefined)
    ?? emptyMonthlyQuest(monthKey);
  const monthTitle = new Date(`${quest.monthKey}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'long',
    timeZone: 'UTC',
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea} testID="quests-safe-area">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.screen}
      >
        <View style={styles.hero}>
          <Text accessibilityLabel={`${quest.questPoints} of ${quest.questTarget} quest points`} selectable style={styles.eyebrow}>
            {quest.questPoints} / {quest.questTarget} QUEST POINTS
          </Text>
          <View style={styles.mascotHalo}>
            <Image
              accessibilityLabel="Rex, the Learn Expo quest guide"
              contentFit="contain"
              source={require('@/assets/logo.png')}
              style={styles.mascot}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text selectable style={styles.title}>{monthTitle} Quest</Text>
            <Text selectable style={styles.subtitle}>
              Complete learning goals, build your streak, and move every long-term reward forward.
            </Text>
          </View>
        </View>

        <View accessibilityLabel="Quest progress" style={styles.questList}>
          <QuestProgressCard color="#F28B19" icon="flame" label="Extend your streak" target={quest.streakTarget} value={quest.streakExtensions} />
          <QuestProgressCard color="#2289FD" icon="book-open-check" label="Complete 2 lessons" target={quest.lessonsTarget} value={quest.lessonsCompleted} />
          <QuestProgressCard color="#27A844" icon="target" label="Score 80% in 3 lessons" target={quest.highAccuracyTarget} value={quest.highAccuracyLessons} />
          <QuestProgressCard color="#8C5BD6" icon="calendar-days" label={`${monthTitle} Quest`} target={quest.questTarget} value={quest.questPoints} />
        </View>

        <View style={styles.rewardNote}>
          <Text selectable style={styles.rewardTitle}>Every lesson counts</Text>
          <Text selectable style={styles.rewardText}>Finish a lesson to add one quest point and refresh these goals automatically.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function emptyMonthlyQuest(monthKey: string): MonthlyQuest {
  return {
    monthKey,
    questPoints: 0,
    questTarget: 30,
    lessonsCompleted: 0,
    lessonsTarget: 2,
    highAccuracyLessons: 0,
    highAccuracyTarget: 3,
    streakExtensions: 0,
    streakTarget: 1,
  };
}

function QuestMessage({ loading = false, message }: { loading?: boolean; message: string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea} testID="quests-safe-area">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.message} style={styles.screen}>
        {loading ? <ActivityIndicator color="#2289FD" size="large" /> : null}
        <Text accessibilityLiveRegion="polite" selectable style={styles.messageText}>{message}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, width: '100%', maxWidth: 700, alignSelf: 'center', gap: 24, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 32 },
  hero: { alignItems: 'center', gap: 17 },
  eyebrow: { color: '#2289FD', fontSize: 12, fontWeight: '900', letterSpacing: 1.15, textAlign: 'center', fontVariant: ['tabular-nums'] },
  mascotHalo: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center', borderRadius: 74, backgroundColor: '#EAF4FF' },
  mascot: { width: 128, height: 128 },
  heroCopy: { alignItems: 'center', gap: 8 },
  title: { color: '#17213B', fontSize: 36, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { maxWidth: 560, color: '#737D91', fontSize: 16, fontWeight: '600', lineHeight: 23, textAlign: 'center' },
  questList: { width: '100%', gap: 10 },
  rewardNote: { gap: 5, padding: 18, borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#F2F7FF' },
  rewardTitle: { color: '#245F9E', fontSize: 16, fontWeight: '900' },
  rewardText: { color: '#667085', fontSize: 13, lineHeight: 19 },
  message: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  messageText: { color: '#667085', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});

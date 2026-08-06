import { Lucide } from '@react-native-vector-icons/lucide';
import { useConvexAuth, useQuery } from 'convex/react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import { buildUtcMonthWeeks, type MonthCalendarDay } from './month-calendar';

type LearningProgress = {
  lastPracticeDate?: string | null;
};

const EMPTY_ACTIVITY_DATE_KEYS: string[] = [];

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const learner = useLearnerSessionStore((state) => state.session);
  const learnerHydrated = useLearnerSessionStore((state) => state.hasHydrated);
  const latestSummary = useLessonResultsStore((state) => state.latestSummary);
  const latestActivityDateKeys = latestSummary?.weeklyActivityDateKeys ?? EMPTY_ACTIVITY_DATE_KEYS;
  const authenticatedProgress = useQuery(api.learning.getAuthenticatedProgress, isAuthenticated ? {} : 'skip');
  const guestProgress = useQuery(api.learning.getGuestProgress, !isAuthenticated && learner ? learner : 'skip');
  const learning = isAuthenticated ? authenticatedProgress : guestProgress;

  if (authLoading || (!isAuthenticated && !learnerHydrated) || learning === undefined) {
    return <CalendarMessage message="Restoring your practice calendar…" />;
  }

  const monthKey = new Date().toISOString().slice(0, 7);
  const serverActivityDateKeys = (learning.monthlyActivityDateKeys ?? []) as string[];
  const recentPracticeDateKeys = (learning.progress as LearningProgress[])
    .map((item) => item.lastPracticeDate)
    .filter((dateKey): dateKey is string => Boolean(dateKey));
  const completedDateKeys = [...new Set([
    ...serverActivityDateKeys,
    ...latestActivityDateKeys.filter((dateKey) => dateKey.startsWith(monthKey)),
    ...recentPracticeDateKeys.filter((dateKey) => dateKey.startsWith(monthKey)),
  ])];
  const weeks = buildUtcMonthWeeks(monthKey, completedDateKeys);
  const monthTitle = new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'long',
    timeZone: 'UTC',
  });
  const compact = width < 520;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.heading}>
        <Text selectable style={[styles.title, compact && styles.titleCompact]}>{monthTitle}</Text>
        <Text accessibilityLabel={`${completedDateKeys.length} practice days this month`} selectable style={styles.summary}>
          {completedDateKeys.length} practice day{completedDateKeys.length === 1 ? '' : 's'} this month
        </Text>
      </View>

      <View accessibilityLabel={`${monthTitle} practice calendar, ${weeks.length} weeks`} style={styles.weekList}>
        {weeks.map((days, index) => (
          <View accessibilityLabel={`Week ${index + 1} of ${weeks.length}`} key={days[0].dateKey} style={[styles.weekCard, compact && styles.weekCardCompact]}>
            {days.map((day) => <CalendarDay compact={compact} day={day} key={day.dateKey} monthTitle={monthTitle} />)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function CalendarDay({ compact, day, monthTitle }: { compact: boolean; day: MonthCalendarDay; monthTitle: string }) {
  const dateLabel = new Date(`${day.dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const state = day.completed ? 'completed' : day.inMonth ? 'not completed' : `outside ${monthTitle}`;

  return (
    <View accessibilityLabel={`${day.label}, ${dateLabel}, ${state}`} style={[styles.day, !day.inMonth && styles.dayOutside]}>
      <View style={[styles.dayCircle, compact && styles.dayCircleCompact, day.completed && styles.dayCircleCompleted]}>
        {day.completed ? (
          <Lucide color="#FFFFFF" name="check" size={compact ? 19 : 22} />
        ) : (
          <Text selectable style={[styles.dayInitial, compact && styles.dayInitialCompact]}>{day.label.slice(0, 1)}</Text>
        )}
      </View>
      <Text selectable numberOfLines={1} style={[styles.dayLabel, compact && styles.dayLabelCompact]}>{day.label.slice(0, 3)}</Text>
    </View>
  );
}

function CalendarMessage({ message }: { message: string }) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.message} style={styles.screen}>
      <ActivityIndicator color="#F29A32" size="large" />
      <Text accessibilityLiveRegion="polite" selectable style={styles.messageText}>{message}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, width: '100%', maxWidth: 780, alignSelf: 'center', gap: 28, paddingHorizontal: 16, paddingTop: 64, paddingBottom: 36 },
  heading: { gap: 7 },
  title: { color: '#121212', fontSize: 68, fontWeight: '900', letterSpacing: -2.4 },
  titleCompact: { fontSize: 52, letterSpacing: -1.8 },
  summary: { color: '#7B8496', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  weekList: { gap: 18 },
  weekCard: { minHeight: 128, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 18, paddingVertical: 18, borderRadius: 28, borderCurve: 'continuous', backgroundColor: '#FFF7E8' },
  weekCardCompact: { minHeight: 108, gap: 2, paddingHorizontal: 8, paddingVertical: 14, borderRadius: 22 },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: 9 },
  dayOutside: { opacity: 0.35 },
  dayCircle: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#E7E9EE' },
  dayCircleCompact: { width: 42, height: 42, borderRadius: 21 },
  dayCircleCompleted: { backgroundColor: '#F29A32' },
  dayInitial: { color: '#7D8698', fontSize: 18, fontWeight: '900' },
  dayInitialCompact: { fontSize: 15 },
  dayLabel: { maxWidth: '100%', color: '#7D8698', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  dayLabelCompact: { fontSize: 10 },
  message: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  messageText: { color: '#667085', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});

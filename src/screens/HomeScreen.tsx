import { useConvexAuth, useQuery } from 'convex/react';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import {
  createLessonNodes,
  LessonPath,
  ProgressHeader,
  selectCurrentCourse,
  selectCurrentUnit,
  type CoursePath,
  type CourseProgress,
  type PublishedCourse,
  UnitCard,
} from '@/features/home';
import { useLearnerRewardsStore } from '@/state/learner-rewards-store';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useHomePushNotificationRegistration } from '@/services/notifications/push-notification-manager';

export default function HomeScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const learner = useLearnerSessionStore((state) => state.session);
  const courses = useQuery(api.content.listPublishedCourses);
  const currentUser = useQuery(api.users.current, isAuthenticated ? {} : 'skip');
  const authenticatedProgress = useQuery(api.learning.getAuthenticatedProgress, isAuthenticated ? {} : 'skip');
  const guestProgress = useQuery(api.learning.getGuestProgress, !isAuthenticated && learner ? learner : 'skip');
  const learning = isAuthenticated ? authenticatedProgress : guestProgress;
  const setGemBalance = useLearnerRewardsStore((state) => state.setGemBalance);
  useHomePushNotificationRegistration(
    Boolean(isAuthenticated && currentUser),
    currentUser?.onboarding?.reminderPreference,
  );
  const selectedCourse = selectCurrentCourse(
    (courses ?? []) as PublishedCourse[],
    (learning?.progress ?? []) as CourseProgress[],
  );
  const coursePath = useQuery(
    api.content.getCoursePath,
    selectedCourse ? { courseKey: selectedCourse.key } : 'skip',
  ) as CoursePath | null | undefined;

  useEffect(() => {
    if (learning?.gems !== undefined) setGemBalance(learning.gems);
  }, [learning?.gems, setGemBalance]);

  if (authLoading || courses === undefined || !learning || (selectedCourse && coursePath === undefined)) {
    return <HomeMessage loading message="Restoring your learning path…" />;
  }
  if (!selectedCourse || !coursePath) {
    return <HomeMessage message="Your learning path is not available yet." />;
  }

  const progress = learning.progress.find((item) => item.courseKey === selectedCourse.key) as CourseProgress | undefined;
  const unit = selectCurrentUnit(coursePath, progress);
  if (!unit) return <HomeMessage message="This course does not have a published unit yet." />;

  const lessons = createLessonNodes(coursePath, unit, progress);
  const totalXp = learning.progress.reduce((total, item) => total + item.totalXp, 0);
  const courseNumber = Math.max(0, courses.findIndex((course) => course.key === selectedCourse.key)) + 1;
  const unitNumber = Math.max(0, coursePath.units.findIndex((item) => item.key === unit.key)) + 1;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProgressHeader
          hearts={progress?.hearts ?? 5}
          streak={learning.streakDays}
          totalXp={totalXp}
        />
        <UnitCard
          course={selectedCourse}
          courseNumber={courseNumber}
          unit={unit}
          unitNumber={unitNumber}
        />
        {lessons.length ? (
          <LessonPath lessons={lessons} />
        ) : (
          <View style={styles.emptyLessons}>
            <Text selectable style={styles.messageText}>Lessons for this unit are coming soon.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeMessage({ loading = false, message }: { loading?: boolean; message: string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.message}>
      {loading ? <ActivityIndicator color="#1689EE" size="large" /> : null}
      <Text accessibilityLiveRegion="polite" selectable style={styles.messageText}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFD' },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', gap: 16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: '#F8FAFD' },
  messageText: { color: '#667085', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyLessons: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24 },
});

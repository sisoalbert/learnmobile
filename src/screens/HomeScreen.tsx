import { Lucide } from '@react-native-vector-icons/lucide';
import { useConvexAuth, useQuery } from 'convex/react';
import { Link } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LEARNING_PATHS,
  type AvailableLearningPath,
  type ComingSoonLearningPath,
} from '@/features/learning-paths';
import { useSessionStore } from '@/state/sessionStore';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { api } from '../../convex/_generated/api';

export default function HomeScreen() {
  const { isAuthenticated: convexAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useSessionStore((state) => state.user);
  const learner = useLearnerSessionStore((state) => state.session);
  const beginnerPath = LEARNING_PATHS.find((path): path is AvailableLearningPath => path.status === 'available');
  const courses = useQuery(api.content.listPublishedCourses);
  const authenticatedProgress = useQuery(api.learning.getAuthenticatedProgress, convexAuthenticated ? {} : 'skip');
  const guestProgress = useQuery(api.learning.getGuestProgress, !convexAuthenticated && learner ? learner : 'skip');
  const learning = convexAuthenticated ? authenticatedProgress : guestProgress;
  const lockedPaths = LEARNING_PATHS.filter((path): path is ComingSoonLearningPath => path.status === 'coming_soon');
  const greeting = user?.name ? `Welcome back, ${user.name}` : 'Welcome to Learn Expo';

  if (authLoading) {
    return (
      <SafeAreaView style={styles.loadingState} edges={['top', 'bottom']}>
        <ActivityIndicator color="#2289FD" size="large" />
        <Text accessibilityLiveRegion="polite" selectable style={styles.syncingText}>
          Restoring your learning plan…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text selectable style={styles.eyebrow}>{convexAuthenticated ? 'YOUR LEARNING PLAN' : 'GUEST LEARNING PLAN'}</Text>
            <Text selectable style={styles.welcome}>{greeting}</Text>
          </View>
          <View style={styles.headerActions}>
            <View accessibilityLabel={`${learning?.gems ?? 0} gems`} style={styles.gemPill}>
              <Lucide name="gem" size={17} color="#16889A" />
              <Text selectable style={styles.gemText}>{learning?.gems ?? 0}</Text>
            </View>
            <Link href="/profile" asChild>
              <Pressable accessibilityLabel="View profile" accessibilityRole="link" style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}>
                <Lucide name="user" size={22} color="#1E73D1" />
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.intro}>
          <Text selectable style={styles.title}>Learning Paths</Text>
          <Text selectable style={styles.subtitle}>Master the foundations first. New paths will unlock as Learn Expo grows.</Text>
        </View>

        {courses === undefined && beginnerPath
          ? <AvailablePathCard path={beginnerPath} />
          : <LearningOverview courses={courses ?? []} learning={learning} />}

        <View style={styles.roadmapHeading}>
          <Text selectable style={styles.roadmapTitle}>On the roadmap</Text>
          <Text selectable style={styles.roadmapText}>Preview what you’ll be able to learn next.</Text>
        </View>

        <View style={styles.lockedList}>
          {lockedPaths.map((path) => <ComingSoonPathCard key={path.level} path={path} />)}
        </View>

        <Link href={'/question-types' as never} asChild>
          <Pressable accessibilityRole="link" style={({ pressed }) => [styles.practiceLink, pressed && styles.pressed]}>
            <Lucide name="shapes" size={20} color="#1E73D1" />
            <View style={styles.practiceCopy}>
              <Text selectable style={styles.practiceTitle}>Explore practice formats</Text>
              <Text selectable style={styles.practiceText}>Preview all 14 Learn Expo question types.</Text>
            </View>
            <Lucide name="chevron-right" size={20} color="#7C879C" />
          </Pressable>
        </Link>

        {/* TODO: Restore the Convex todo demo link when it is ready.
        <Link href={'/todo' as never} asChild>
          <Pressable accessibilityRole="link" style={({ pressed }) => [styles.todoLink, pressed && styles.pressed]}>
            <Lucide name="database" size={20} color="#178E43" />
            <View style={styles.practiceCopy}>
              <Text selectable style={styles.todoTitle}>Open the Convex todo demo</Text>
              <Text selectable style={styles.practiceText}>View live sample data from the tasks table.</Text>
            </View>
            <Lucide name="chevron-right" size={20} color="#7C879C" />
          </Pressable>
        </Link>
        */}
      </ScrollView>
    </SafeAreaView>
  );
}

function LearningOverview({
  courses,
  learning,
}: {
  courses: {
    id: string;
    key: string;
    title: string;
    description: string;
    subject: string;
    lessonCount: number;
    exerciseCount: number;
  }[];
  learning?: {
    progress: {
      courseId: string;
      courseKey: string | null;
      currentLessonKey: string | null;
      totalXp: number;
      hearts: number;
      completedLessons: number;
    }[];
    streakDays: number;
    gems: number;
  };
}) {
  const totalXp = learning?.progress.reduce((total, item) => total + item.totalXp, 0) ?? 0;
  const hearts = learning?.progress[0]?.hearts ?? 5;
  const completedLessons = learning?.progress.reduce((total, item) => total + item.completedLessons, 0) ?? 0;

  return (
    <View style={styles.learningOverview}>
      {learning === undefined ? (
        <Text accessibilityLiveRegion="polite" selectable style={styles.syncingText}>
          Syncing your progress…
        </Text>
      ) : (
        <View style={styles.statusRow}>
          <PathStat value={String(totalXp)} label="total XP" />
          <PathStat value={String(hearts)} label="hearts" />
          <PathStat value={String(learning.streakDays)} label="day streak" />
          <PathStat value={String(completedLessons)} label="completed" />
        </View>
      )}
      <View style={styles.publishedCourses}>
        {courses.map((course, index) => {
          const progress = learning?.progress.find((item) => item.courseKey === course.key);
          const available = index === 0 || completedLessons > 0;
          return (
            <Link key={course.key} href={{ pathname: '/courses/[courseKey]', params: { courseKey: course.key } }} asChild>
              <Pressable accessibilityRole="link" style={({ pressed }) => [styles.publishedCourse, pressed && styles.pressed]}>
                <View style={[styles.courseNumber, available && styles.activeCourseNumber]}>
                  <Text selectable style={[styles.courseNumberText, available && styles.activeCourseNumberText]}>{index + 1}</Text>
                </View>
                <View style={styles.practiceCopy}>
                  <Text selectable style={styles.publishedCourseTitle}>{course.title}</Text>
                  <Text selectable style={styles.practiceText}>{course.lessonCount} lessons · {course.exerciseCount} exercises · {progress?.totalXp ?? 0} XP</Text>
                </View>
                <Lucide name={progress?.currentLessonKey ? 'play' : 'chevron-right'} size={19} color="#2289FD" />
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function AvailablePathCard({ path }: { path: AvailableLearningPath }) {
  const progressPercent = Math.round(path.progress * 100);
  return (
    <View style={[styles.availableCard, { borderColor: path.accent }]}>
      <View style={styles.pathHeader}>
        <View style={[styles.pathIcon, { backgroundColor: path.softColor }]}>
          <Lucide name="sprout" size={26} color={path.accent} />
        </View>
        <View style={styles.pathHeadingCopy}>
          <Text selectable style={styles.pathTitle}>{path.title}</Text>
          <Text selectable style={[styles.availableStatus, { color: path.accent }]}>AVAILABLE</Text>
        </View>
        <View style={[styles.livePill, { backgroundColor: path.softColor }]}>
          <Lucide name="circle-check" size={15} color={path.accent} />
          <Text selectable style={[styles.liveText, { color: path.accent }]}>LIVE</Text>
        </View>
      </View>

      <Text selectable style={styles.pathGoal}>{path.goal}</Text>

      <View style={styles.progressGroup}>
        <View style={styles.progressLabels}>
          <Text selectable style={styles.progressLabel}>Your progress</Text>
          <Text selectable style={[styles.progressValue, { color: path.accent }]}>{progressPercent}%</Text>
        </View>
        <View
          accessibilityLabel={`${progressPercent}% of the Beginner path complete`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progressPercent, text: `${progressPercent}% complete` }}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: path.accent }]} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <PathStat value={`${path.courses.length}`} label="courses" />
        <PathStat value={path.lessonRange} label="lessons" />
        <PathStat value={path.questionRange} label="questions" />
      </View>

      <View style={styles.courseList}>
        {path.courses.map((course, index) => (
          <View key={course} style={styles.courseRow}>
            <View style={[styles.courseNumber, index === 0 && { backgroundColor: path.softColor }]}>
              <Text selectable style={[styles.courseNumberText, index === 0 && { color: path.accent }]}>{index + 1}</Text>
            </View>
            <Text selectable style={[styles.courseText, index === 0 && styles.currentCourseText]}>{course}</Text>
            {index === 0 ? <Text selectable style={[styles.currentLabel, { color: path.accent }]}>CURRENT</Text> : <Lucide name="lock" size={14} color="#B4BBC8" />}
          </View>
        ))}
      </View>

      <Link href={'/lessons/first' as never} asChild>
        <Pressable accessibilityRole="link" style={({ pressed }) => [styles.continueButton, { backgroundColor: path.accent }, pressed && styles.pressed]}>
          <Text selectable style={styles.continueText}>CONTINUE LEARNING</Text>
          <Lucide name="arrow-right" size={19} color="#FFFFFF" />
        </Pressable>
      </Link>
    </View>
  );
}

function ComingSoonPathCard({ path }: { path: ComingSoonLearningPath }) {
  return (
    <Link href={{ pathname: '/learning-paths/[level]', params: { level: path.level } } as never} asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => [styles.lockedCard, pressed && styles.pressed]}>
        <View style={[styles.pathIcon, { backgroundColor: path.softColor }]}>
          <Lucide name={path.level === 'intermediate' ? 'rocket' : 'award'} size={25} color={path.accent} />
        </View>
        <View style={styles.lockedCopy}>
          <View style={styles.lockedTitleRow}>
            <Text selectable style={styles.lockedTitle}>{path.title}</Text>
            <View style={[styles.comingSoonPill, { backgroundColor: path.softColor }]}>
              <Text selectable style={[styles.comingSoonText, { color: path.accent }]}>COMING SOON</Text>
            </View>
          </View>
          <Text selectable style={styles.lockedGoal}>{path.goal}</Text>
          <Text selectable style={styles.topicPreview}>{path.topics.slice(0, 3).join('  •  ')}</Text>
        </View>
        <View style={styles.lockedAction}>
          <Lucide name="lock" size={17} color="#8C95A7" />
          <Lucide name="chevron-right" size={19} color="#8C95A7" />
        </View>
      </Pressable>
    </Link>
  );
}

function PathStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text selectable style={styles.statValue}>{value}</Text>
      <Text selectable style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#F7F9FC' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 22, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  headerCopy: { flex: 1, gap: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  gemPill: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#E8FBFD' },
  gemText: { color: '#167786', fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  eyebrow: { color: '#1E73D1', fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  welcome: { color: '#667085', fontSize: 15, fontWeight: '600' },
  profileButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#EAF4FF' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  intro: { gap: 7 },
  title: { color: '#17213B', fontSize: 34, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { maxWidth: 570, color: '#737D91', fontSize: 16, lineHeight: 23 },
  availableCard: { gap: 20, padding: 20, borderWidth: 2, borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: '0 10px 30px rgba(23, 33, 59, 0.08)' },
  pathHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pathIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderCurve: 'continuous' },
  pathHeadingCopy: { flex: 1, gap: 2 },
  pathTitle: { color: '#17213B', fontSize: 23, fontWeight: '900' },
  availableStatus: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  liveText: { fontSize: 11, fontWeight: '900' },
  pathGoal: { color: '#4B5568', fontSize: 16, fontWeight: '600', lineHeight: 23 },
  progressGroup: { gap: 8 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: '#667085', fontSize: 13, fontWeight: '700' },
  progressValue: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 10, overflow: 'hidden', borderRadius: 999, backgroundColor: '#E8EBF0' },
  progressFill: { height: '100%', borderRadius: 999 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 12, borderCurve: 'continuous', backgroundColor: '#F5F7FA' },
  statValue: { color: '#27324B', fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { color: '#8790A2', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  courseList: { overflow: 'hidden', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 16, borderCurve: 'continuous' },
  courseRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEF0F3' },
  courseNumber: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F0F2F5' },
  courseNumberText: { color: '#8B94A6', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  courseText: { flex: 1, color: '#677084', fontSize: 14, fontWeight: '600' },
  currentCourseText: { color: '#27324B', fontWeight: '800' },
  currentLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  continueButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, paddingVertical: 15, borderRadius: 16, borderCurve: 'continuous', boxShadow: '0 4px 0 rgba(14, 92, 39, 0.32)' },
  continueText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  roadmapHeading: { gap: 4 },
  roadmapTitle: { color: '#27324B', fontSize: 20, fontWeight: '900' },
  roadmapText: { color: '#7A8498', fontSize: 14 },
  lockedList: { gap: 12 },
  lockedCard: { minHeight: 118, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  lockedCopy: { flex: 1, gap: 6 },
  lockedTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  lockedTitle: { color: '#344054', fontSize: 18, fontWeight: '900' },
  comingSoonPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  comingSoonText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  lockedGoal: { color: '#697386', fontSize: 13.5, lineHeight: 19 },
  topicPreview: { color: '#9A9FAE', fontSize: 11.5, fontWeight: '600' },
  lockedAction: { alignItems: 'center', gap: 9 },
  learningOverview: { gap: 14, padding: 18, borderWidth: 2, borderColor: '#27A844', borderRadius: 24, backgroundColor: '#FFFFFF', boxShadow: '0 10px 30px rgba(23, 33, 59, 0.08)' },
  statusRow: { flexDirection: 'row', gap: 8 },
  syncingText: { color: '#667085', fontSize: 15, fontWeight: '700', paddingVertical: 12 },
  publishedCourses: { gap: 8 },
  publishedCourse: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 15, backgroundColor: '#FFFFFF' },
  publishedCourseTitle: { color: '#27324B', fontSize: 14, fontWeight: '800' },
  activeCourseNumber: { backgroundColor: '#EAF8EE' },
  activeCourseNumberText: { color: '#27A844' },
  practiceLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: '#DCE6F3', borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#F1F7FE' },
  todoLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderColor: '#D8EBDD', borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#F0FAF3' },
  practiceCopy: { flex: 1, gap: 2 },
  practiceTitle: { color: '#245F9E', fontSize: 14, fontWeight: '800' },
  todoTitle: { color: '#176B38', fontSize: 14, fontWeight: '800' },
  practiceText: { color: '#718096', fontSize: 12.5 },
});

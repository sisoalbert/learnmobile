import { Lucide } from '@react-native-vector-icons/lucide';
import { useConvexAuth, useQuery } from 'convex/react';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../convex/_generated/api';
import { useLearnerSessionStore } from '@/state/learner-session-store';

export function CourseScreen({ courseKey }: { courseKey: string }) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const learner = useLearnerSessionStore((state) => state.session);
  const course = useQuery(api.content.getCoursePath, { courseKey });
  const authenticatedProgress = useQuery(api.learning.getAuthenticatedProgress, isAuthenticated ? {} : 'skip');
  const guestProgress = useQuery(api.learning.getGuestProgress, !isAuthenticated && learner ? learner : 'skip');
  const progress = (isAuthenticated ? authenticatedProgress : guestProgress)?.progress
    .find((item) => item.courseKey === courseKey);
  const completedLessons = progress?.completedLessons ?? 0;

  if (course === undefined) return <CourseMessage message="Loading course…" />;
  if (course === null) return <CourseMessage message="This course is not available." />;

  let lessonPosition = 0;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityLabel="Back to home" accessibilityRole="button" onPress={() => router.replace('/home')} style={styles.backButton}>
          <Lucide name="arrow-left" size={21} color="#344054" />
        </Pressable>
        <View style={styles.hero}>
          <View style={styles.icon}><Lucide name="book-open" size={28} color="#2289FD" /></View>
          <Text selectable style={styles.title}>{course.title}</Text>
          <Text selectable style={styles.description}>{course.description}</Text>
          <View style={styles.stats}>
            <Text selectable style={styles.stat}>{completedLessons} lessons complete</Text>
            <Text selectable style={styles.stat}>{progress?.totalXp ?? 0} XP</Text>
            <Text selectable style={styles.stat}>{progress?.hearts ?? 5} hearts</Text>
          </View>
        </View>

        {course.units.map((unit) => (
          <View key={unit.key} style={styles.unit}>
            <Text selectable style={styles.unitTitle}>{unit.title}</Text>
            <View style={styles.lessonList}>
              {unit.lessons.map((lesson) => {
                const position = lessonPosition++;
                const unlocked = position <= completedLessons;
                const completed = position < completedLessons;
                const current = position === completedLessons;
                const card = (
                  <View style={[styles.lessonCard, current && styles.currentCard, !unlocked && styles.lockedCard]}>
                    <View style={[styles.lessonNumber, completed && styles.completedNumber]}>
                      <Lucide name={completed ? 'check' : unlocked ? 'play' : 'lock'} size={17} color={completed ? '#FFFFFF' : unlocked ? '#2289FD' : '#98A2B3'} />
                    </View>
                    <View style={styles.lessonCopy}>
                      <Text selectable style={styles.lessonTitle}>{lesson.title}</Text>
                      <Text selectable style={styles.lessonMeta}>{lesson.xpReward} XP</Text>
                    </View>
                    {current ? <Text selectable style={styles.currentLabel}>CURRENT</Text> : null}
                  </View>
                );
                return unlocked ? (
                  <Link key={lesson.key} href={{ pathname: '/lessons/[lessonKey]', params: { lessonKey: lesson.key } }} asChild>
                    <Pressable accessibilityRole="link" style={({ pressed }) => pressed && styles.pressed}>{card}</Pressable>
                  </Link>
                ) : <View key={lesson.key}>{card}</View>;
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseMessage({ message }: { message: string }) {
  return <SafeAreaView style={styles.message}><Text selectable style={styles.description}>{message}</Text></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 24, padding: 20, paddingBottom: 40 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#FFFFFF' },
  hero: { alignItems: 'center', gap: 10, padding: 24, borderRadius: 24, backgroundColor: '#FFFFFF' },
  icon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#EAF4FF' },
  title: { color: '#17213B', fontSize: 30, fontWeight: '900', textAlign: 'center' },
  description: { color: '#667085', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 },
  stat: { color: '#245F9E', fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EAF4FF' },
  unit: { gap: 12 },
  unitTitle: { color: '#344054', fontSize: 19, fontWeight: '900' },
  lessonList: { gap: 10 },
  lessonCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 18, backgroundColor: '#FFFFFF' },
  currentCard: { borderWidth: 2, borderColor: '#2289FD' },
  lockedCard: { opacity: 0.58 },
  lessonNumber: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#EAF4FF' },
  completedNumber: { backgroundColor: '#27A844' },
  lessonCopy: { flex: 1, gap: 3 },
  lessonTitle: { color: '#27324B', fontSize: 15, fontWeight: '800' },
  lessonMeta: { color: '#8790A2', fontSize: 12, fontWeight: '700' },
  currentLabel: { color: '#2289FD', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  pressed: { opacity: 0.72 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7F9FC' },
});

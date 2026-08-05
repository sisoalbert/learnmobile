import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLearnerRewardsStore } from '@/state/learner-rewards-store';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import { api } from '../../../convex/_generated/api';
import { buildUtcWeekDays } from './utc-week';

export const STREAK_INTRO_DURATION_MS = 1800;

function usePostLessonSummary() {
  const router = useRouter();
  const hasHydrated = useLessonResultsStore((state) => state.hasHydrated);
  const summary = useLessonResultsStore((state) => state.latestSummary);

  useEffect(() => {
    if (hasHydrated && !summary) router.replace('/home');
  }, [hasHydrated, router, summary]);

  return hasHydrated ? summary : null;
}

function PostLessonShell({
  eyebrow,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
  secondaryLabel,
  onSecondaryPress,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stage}>
          <Text selectable style={styles.eyebrow}>{eyebrow}</Text>
          <Animated.View entering={ZoomIn.duration(260)} style={styles.mascotHalo}>
            <Image
              accessibilityLabel="Rex, the Learn Expo guide"
              contentFit="contain"
              source={require('../../../assets/logo.png')}
              style={styles.mascot}
            />
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(100).duration(260)} style={styles.copy}>
            <Text selectable style={styles.title}>{title}</Text>
            <Text selectable style={styles.subtitle}>{subtitle}</Text>
          </Animated.View>
          {children}
        </View>

        {primaryLabel && onPrimaryPress ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: primaryDisabled }}
              disabled={primaryDisabled}
              onPress={onPrimaryPress}
              style={({ pressed }) => [
                styles.primaryButton,
                primaryDisabled && styles.buttonDisabled,
                pressed && !primaryDisabled && styles.buttonPressed,
              ]}
            >
              <Text selectable style={styles.primaryButtonText}>{primaryLabel}</Text>
            </Pressable>
            {secondaryLabel && onSecondaryPress ? (
              <Pressable accessibilityRole="button" onPress={onSecondaryPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}>
                <Text selectable style={styles.secondaryButtonText}>{secondaryLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PostLessonAdScreen() {
  const router = useRouter();
  const summary = usePostLessonSummary();
  if (!summary) return null;

  return (
    <PostLessonShell
      eyebrow="SPONSORED BREAK · PLACEHOLDER"
      title="A quick break"
      subtitle="This illustrated screen reserves the interstitial slot while Learn Expo keeps practice free."
      primaryLabel="Continue"
      onPrimaryPress={() => router.replace('/lessons/premium')}
    >
      <View style={styles.promoCard}>
        <View style={styles.promoIcon}><Lucide name="volume-2" size={24} color="#2289FD" /></View>
        <View style={styles.promoCopy}>
          <Text selectable style={styles.promoTitle}>Build. Practice. Ship.</Text>
          <Text selectable style={styles.promoText}>Keep your momentum going with another short Expo lesson.</Text>
        </View>
      </View>
    </PostLessonShell>
  );
}

export function PostLessonPremiumScreen() {
  const router = useRouter();
  const summary = usePostLessonSummary();
  if (!summary) return null;
  const continueFlow = () => router.replace('/lessons/streak-increase');

  return (
    <PostLessonShell
      eyebrow="LEARN EXPO PREMIUM · PREVIEW"
      title="Try free for 30 days"
      subtitle="Learn without interruptions and unlock more ways to practice. Cancel anytime."
      primaryLabel="Try free"
      onPrimaryPress={continueFlow}
      secondaryLabel="Not now"
      onSecondaryPress={continueFlow}
    >
      <View style={styles.benefitList}>
        <Benefit icon="badge-check" text="Ad-free lessons" />
        <Benefit icon="heart" text="More practice flexibility" />
        <Benefit icon="sparkles" text="Future premium learning tools" />
      </View>
    </PostLessonShell>
  );
}

function Benefit({ icon, text }: { icon: LucideIconName; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Lucide name={icon} size={20} color="#8C5BD6" />
      <Text selectable style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export function PostLessonStreakIncreaseScreen() {
  const router = useRouter();
  const summary = usePostLessonSummary();

  useEffect(() => {
    if (!summary) return;
    const timer = setTimeout(() => router.replace('/lessons/streak-details'), STREAK_INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [router, summary]);

  if (!summary) return null;
  const streakDays = summary.streakDays ?? 0;

  return (
    <PostLessonShell
      eyebrow="STREAK INCREASED"
      title={`${streakDays} day${streakDays === 1 ? '' : 's'} streak`}
      subtitle="I knew you’d come back! Every practice day builds your Expo momentum."
    >
      <ActivityIndicator accessibilityLabel="Opening weekly streak tracker" color="#F28B19" size="small" />
    </PostLessonShell>
  );
}

export function PostLessonStreakDetailsScreen() {
  const router = useRouter();
  const summary = usePostLessonSummary();
  const days = useMemo(
    () => summary
      ? buildUtcWeekDays(summary.completedAt, summary.weeklyActivityDateKeys ?? [])
      : [],
    [summary],
  );
  if (!summary) return null;
  const streakDays = summary.streakDays ?? 0;

  return (
    <PostLessonShell
      eyebrow="YOUR WEEK"
      title={`${streakDays} day${streakDays === 1 ? '' : 's'} streak`}
      subtitle="You showed up today. Keep the chain going tomorrow."
      primaryLabel="I’m doing it"
      onPrimaryPress={() => router.replace('/lessons/monthly-quest')}
    >
      <View accessibilityLabel="Weekly streak tracker" style={styles.weekTracker}>
        {days.map((day) => (
          <View accessibilityLabel={`${day.label}, ${day.completed ? 'completed' : 'not completed'}`} key={day.dateKey} style={styles.dayColumn}>
            <View style={[styles.dayCircle, day.completed && styles.dayCircleCompleted]}>
              {day.completed ? <Lucide name="check" size={18} color="#FFFFFF" /> : <Text selectable style={styles.dayLetter}>{day.label.slice(0, 1)}</Text>}
            </View>
            <Text selectable style={styles.dayLabel}>{day.label.slice(0, 3)}</Text>
          </View>
        ))}
      </View>
    </PostLessonShell>
  );
}

export function PostLessonMonthlyQuestScreen() {
  const router = useRouter();
  const summary = usePostLessonSummary();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const learner = useLearnerSessionStore((state) => state.session);
  const learnerHydrated = useLearnerSessionStore((state) => state.hasHydrated);
  const claimAuthenticated = useMutation(api.learning.claimAuthenticatedLessonReward);
  const claimGuest = useMutation(api.learning.claimGuestLessonReward);
  const setClaimedReward = useLessonResultsStore((state) => state.setClaimedReward);
  const setGemBalance = useLearnerRewardsStore((state) => state.setGemBalance);
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (summary && (!summary.monthlyQuest || !summary.attemptId)) router.replace('/home');
  }, [router, summary]);

  if (!summary) return null;
  const quest = summary.monthlyQuest;
  if (!quest || !summary.attemptId) return null;
  const identityReady = !authLoading && (isAuthenticated || (learnerHydrated && Boolean(learner)));

  const openChest = async () => {
    if (isClaiming) return;
    if (!identityReady) return;
    if (!isAuthenticated && !learner) {
      setErrorMessage('Your guest session is still loading. Please try again.');
      return;
    }
    setErrorMessage('');
    setIsClaiming(true);
    try {
      const result = isAuthenticated
        ? await claimAuthenticated({ attemptId: summary.attemptId! })
        : await claimGuest({ ...learner!, attemptId: summary.attemptId! });
      setGemBalance(result.totalGems);
      setClaimedReward(result);
      router.replace('/lessons/reward');
    } catch {
      setErrorMessage('Unable to open your chest. Your reward is safe—please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  const monthTitle = new Date(`${quest.monthKey}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', timeZone: 'UTC' });

  return (
    <PostLessonShell
      eyebrow="+1 QUEST POINT!"
      title={`${monthTitle} Quest`}
      subtitle="Today’s lesson moved every long-term goal forward."
      primaryLabel={!identityReady ? 'Restoring learner…' : isClaiming ? 'Opening…' : 'Open Chest'}
      primaryDisabled={isClaiming || !identityReady}
      onPrimaryPress={() => void openChest()}
    >
      <View style={styles.questList}>
        <QuestCard icon="flame" label="Extend your streak" value={quest.streakExtensions} target={quest.streakTarget} color="#F28B19" />
        <QuestCard icon="book-open-check" label="Complete 2 lessons" value={quest.lessonsCompleted} target={quest.lessonsTarget} color="#2289FD" />
        <QuestCard icon="target" label="Score 80% in 3 lessons" value={quest.highAccuracyLessons} target={quest.highAccuracyTarget} color="#27A844" />
        <QuestCard icon="calendar-days" label={`${monthTitle} Quest`} value={quest.questPoints} target={quest.questTarget} color="#8C5BD6" />
      </View>
      {errorMessage ? <Text accessibilityRole="alert" selectable style={styles.errorText}>{errorMessage}</Text> : null}
    </PostLessonShell>
  );
}

function QuestCard({ icon, label, value, target, color }: { icon: LucideIconName; label: string; value: number; target: number; color: string }) {
  const progress = Math.min(1, value / Math.max(1, target));
  return (
    <View style={styles.questCard}>
      <View style={[styles.questIcon, { backgroundColor: `${color}18` }]}><Lucide name={icon} size={20} color={color} /></View>
      <View style={styles.questCopy}>
        <View style={styles.questLabels}>
          <Text selectable style={styles.questLabel}>{label}</Text>
          <Text selectable style={[styles.questValue, { color }]}>{value} / {target}</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { backgroundColor: color, width: `${progress * 100}%` }]} /></View>
      </View>
    </View>
  );
}

export function PostLessonRewardScreen() {
  const router = useRouter();
  const summary = usePostLessonSummary();
  const claimedReward = useLessonResultsStore((state) => state.claimedReward);
  const resetLesson = useLessonResultsStore((state) => state.resetLesson);
  const gemBalance = useLearnerRewardsStore((state) => state.gems);
  const setGemBalance = useLearnerRewardsStore((state) => state.setGemBalance);

  useEffect(() => {
    if (summary && !claimedReward) router.replace('/lessons/monthly-quest');
  }, [claimedReward, router, summary]);

  useEffect(() => {
    if (claimedReward) setGemBalance(claimedReward.totalGems);
  }, [claimedReward, setGemBalance]);

  if (!summary || !claimedReward) return null;

  return (
    <PostLessonShell
      eyebrow={`${Math.max(gemBalance, claimedReward.totalGems)} GEMS TOTAL`}
      title={`+${claimedReward.gemsEarned} gems`}
      subtitle="Your chest is open and the gems are safely stored in your learner balance."
      primaryLabel="Continue"
      onPrimaryPress={() => {
        resetLesson();
        router.replace('/home');
      }}
    >
      <View style={styles.gemReward}>
        <Lucide name="gem" size={62} color="#2AB7CA" />
        <Text selectable style={styles.gemBalance}>Balance: {Math.max(gemBalance, claimedReward.totalGems)}</Text>
      </View>
    </PostLessonShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, width: '100%', maxWidth: 700, alignSelf: 'center', justifyContent: 'space-between', gap: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
  stage: { alignItems: 'center', gap: 20 },
  eyebrow: { color: '#2289FD', fontSize: 11, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  mascotHalo: { width: 145, height: 145, alignItems: 'center', justifyContent: 'center', borderRadius: 73, backgroundColor: '#EAF4FF' },
  mascot: { width: 126, height: 126 },
  copy: { alignItems: 'center', gap: 8 },
  title: { color: '#17213B', fontSize: 34, fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  subtitle: { maxWidth: 540, color: '#737D91', fontSize: 16, fontWeight: '600', lineHeight: 23, textAlign: 'center' },
  actions: { gap: 10 },
  primaryButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#2289FD', boxShadow: '0 4px 0 #1A6ECE' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondaryButtonText: { color: '#667085', fontSize: 15, fontWeight: '800' },
  buttonPressed: { opacity: 0.88, transform: [{ translateY: 2 }] },
  secondaryPressed: { opacity: 0.6 },
  buttonDisabled: { opacity: 0.55 },
  promoCard: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#F1F7FE' },
  promoIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFFFFF' },
  promoCopy: { flex: 1, gap: 4 },
  promoTitle: { color: '#245F9E', fontSize: 17, fontWeight: '900' },
  promoText: { color: '#667085', fontSize: 13, lineHeight: 19 },
  benefitList: { width: '100%', gap: 10, padding: 18, borderRadius: 20, backgroundColor: '#F7F2FF' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { color: '#514069', fontSize: 15, fontWeight: '700' },
  weekTracker: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', gap: 6, padding: 14, borderRadius: 20, backgroundColor: '#FFF7E8' },
  dayColumn: { flex: 1, alignItems: 'center', gap: 7 },
  dayCircle: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#E6E8EC' },
  dayCircleCompleted: { backgroundColor: '#F28B19' },
  dayLetter: { color: '#7A8498', fontSize: 13, fontWeight: '900' },
  dayLabel: { color: '#7A8498', fontSize: 10, fontWeight: '800' },
  questList: { width: '100%', gap: 10 },
  questCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 16, backgroundColor: '#FFFFFF' },
  questIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  questCopy: { flex: 1, gap: 8 },
  questLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  questLabel: { flex: 1, color: '#344054', fontSize: 13, fontWeight: '800' },
  questValue: { fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: '#ECEFF3' },
  progressFill: { height: '100%', borderRadius: 999 },
  errorText: { color: '#C43D3D', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  gemReward: { alignItems: 'center', gap: 12, padding: 24, borderRadius: 24, backgroundColor: '#E8FBFD' },
  gemBalance: { color: '#167786', fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
});

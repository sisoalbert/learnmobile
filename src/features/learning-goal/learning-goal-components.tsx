import { Lucide } from '@react-native-vector-icons/lucide';
import { Image } from 'expo-image';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  blue: '#2289FD',
  blueDark: '#1A6ECE',
  blueSoft: '#EAF4FF',
  ink: '#17213B',
  muted: '#737D91',
  border: '#E2E6EC',
  surface: '#FFFFFF',
  disabled: '#D5D5D5',
  disabledShadow: '#BDBDBD',
  orange: '#F59E0B',
  orangeSoft: '#FFF3D6',
};

export type StreakGoal = 3 | 5 | 7;

type LearningGoalShellProps = PropsWithChildren<{
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}>;

export function LearningGoalShell({
  children,
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
  secondaryLabel,
  onSecondaryPress,
}: LearningGoalShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryDisabled }}
            disabled={primaryDisabled}
            onPress={onPrimaryPress}
            style={({ pressed }) => [
              styles.primaryButton,
              primaryDisabled && styles.primaryButtonDisabled,
              pressed && !primaryDisabled && styles.primaryButtonPressed,
            ]}
          >
            <Text selectable style={styles.primaryButtonText}>{primaryLabel}</Text>
          </Pressable>

          {secondaryLabel && onSecondaryPress ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={onSecondaryPress}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.controlPressed]}
            >
              <Text selectable style={styles.secondaryButtonText}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function SpeechBubble({ children }: PropsWithChildren) {
  return (
    <View style={styles.speechBubble}>
      <Text selectable style={styles.speechText}>{children}</Text>
      <View style={styles.speechTailBorder} />
      <View style={styles.speechTail} />
    </View>
  );
}

function Mascot({ compact = false }: { compact?: boolean }) {
  return (
    <Animated.View entering={ZoomIn.duration(260)}>
      <Image
        accessibilityLabel="Rex, the Learn Expo guide"
        contentFit="contain"
        source={require('../../../assets/logo.png')}
        style={[styles.mascot, compact && styles.mascotCompact]}
      />
    </Animated.View>
  );
}

function StepFrame({ children }: PropsWithChildren) {
  return (
    <Animated.View entering={FadeInUp.duration(280)} style={styles.step}>
      {children}
    </Animated.View>
  );
}

export function HabitIntroductionStep() {
  return (
    <StepFrame>
      <SpeechBubble>Nice job! Now let&apos;s build a habit of practicing every day.</SpeechBubble>
      <Mascot />
    </StepFrame>
  );
}

export function DailyPracticePromptStep() {
  return (
    <StepFrame>
      <SpeechBubble>Can you practice every day?</SpeechBubble>
      <Mascot compact />
      <StreakCount prominent={false} />
    </StepFrame>
  );
}

export function StreakConfirmationStep() {
  return (
    <StepFrame>
      <SpeechBubble>Can you practice every day?</SpeechBubble>
      <Mascot compact />
      <StreakCount prominent />
      <WeeklyTracker />
    </StepFrame>
  );
}

function StreakCount({ prominent }: { prominent: boolean }) {
  return (
    <View
      accessibilityLabel="1 day streak"
      style={[styles.streakCount, prominent && styles.streakCountProminent]}
    >
      <Text selectable style={[styles.streakNumber, prominent && styles.streakNumberProminent]}>1</Text>
      <Text selectable style={styles.streakLabel}>day streak</Text>
    </View>
  );
}

const WEEK_DAYS = [
  { short: 'M', name: 'Monday' },
  { short: 'T', name: 'Tuesday' },
  { short: 'W', name: 'Wednesday' },
  { short: 'T', name: 'Thursday' },
  { short: 'F', name: 'Friday' },
  { short: 'S', name: 'Saturday' },
  { short: 'S', name: 'Sunday' },
] as const;

function WeeklyTracker() {
  return (
    <View accessibilityLabel="Weekly streak tracker" style={styles.weeklyTracker}>
      {WEEK_DAYS.map((day, index) => {
        const completed = index === 0;

        return (
          <View
            accessibilityLabel={`${day.name}, ${completed ? 'completed' : 'not completed'}`}
            key={day.name}
            style={styles.dayColumn}
          >
            <View style={[styles.dayCircle, completed && styles.dayCircleCompleted]}>
              {completed ? (
                <Lucide name="check" size={19} color={COLORS.surface} />
              ) : null}
            </View>
            <Text selectable style={[styles.dayLabel, completed && styles.dayLabelCompleted]}>
              {day.short}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const STREAK_GOALS = [
  { days: 3, gems: 30 },
  { days: 5, gems: 500 },
  { days: 7, gems: 700 },
] satisfies { days: StreakGoal; gems: number }[];

export function StreakGoalSelectionStep({
  selectedGoal,
  onSelectGoal,
}: {
  selectedGoal: StreakGoal | null;
  onSelectGoal: (goal: StreakGoal) => void;
}) {
  return (
    <StepFrame>
      <SpeechBubble>
        {selectedGoal === null
          ? 'Let\'s commit to learning with a Streak Goal!'
          : 'Learners with a streak goal are more likely to finish their course!'}
      </SpeechBubble>

      <View style={styles.goalIllustration}>
        <Mascot compact />
        <View accessibilityLabel="Streak goal calendar" style={styles.calendarBadge}>
          <Lucide name="calendar-days" size={30} color={COLORS.blue} />
        </View>
      </View>

      <View accessibilityRole="radiogroup" style={styles.goalList}>
        {STREAK_GOALS.map((goal) => {
          const selected = selectedGoal === goal.days;

          return (
            <Pressable
              accessibilityLabel={`${goal.days} day streak goal, earn ${goal.gems} gems`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={goal.days}
              onPress={() => onSelectGoal(goal.days)}
              style={({ pressed }) => [
                styles.goalCard,
                selected && styles.goalCardSelected,
                pressed && styles.controlPressed,
              ]}
            >
              <View style={[styles.goalIcon, selected && styles.goalIconSelected]}>
                <Lucide name="flame" size={23} color={selected ? COLORS.blue : COLORS.muted} />
              </View>
              <View style={styles.goalCopy}>
                <Text selectable style={[styles.goalTitle, selected && styles.goalTitleSelected]}>
                  {goal.days} days
                </Text>
                <View style={styles.rewardRow}>
                  <Lucide name="gem" size={16} color={COLORS.orange} />
                  <Text selectable style={styles.goalReward}>Earn {goal.gems} gems</Text>
                </View>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  page: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  footer: {
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
  },
  primaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: COLORS.blue,
    boxShadow: `0 4px 0 ${COLORS.blueDark}`,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.disabled,
    boxShadow: `0 4px 0 ${COLORS.disabledShadow}`,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 2 }],
    boxShadow: `0 2px 0 ${COLORS.blueDark}`,
  },
  primaryButtonText: { color: COLORS.surface, fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  secondaryButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.blue, fontSize: 16, fontWeight: '800' },
  step: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 22 },
  speechBubble: {
    width: '100%',
    maxWidth: 430,
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  speechText: { color: COLORS.ink, fontSize: 18, fontWeight: '700', lineHeight: 25, textAlign: 'center' },
  speechTailBorder: {
    position: 'absolute',
    bottom: -11,
    left: '50%',
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.border,
  },
  speechTail: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: 2,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.surface,
  },
  mascot: { width: 190, height: 190 },
  mascotCompact: { width: 132, height: 132 },
  streakCount: { alignItems: 'center', gap: 0 },
  streakCountProminent: {
    minWidth: 170,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: COLORS.orangeSoft,
  },
  streakNumber: {
    color: COLORS.blue,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
    fontVariant: ['tabular-nums'],
  },
  streakNumberProminent: { color: COLORS.orange, fontSize: 72, lineHeight: 76 },
  streakLabel: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  weeklyTracker: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FAFBFC',
  },
  dayColumn: { alignItems: 'center', gap: 7 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E3E6EB' },
  dayCircleCompleted: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orange },
  dayLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  dayLabelCompleted: { color: COLORS.orange },
  goalIllustration: { height: 132, alignItems: 'center', justifyContent: 'center' },
  calendarBadge: {
    position: 'absolute',
    right: -8,
    bottom: 4,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.blueSoft,
  },
  goalList: { width: '100%', gap: 10 },
  goalCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  goalCardSelected: { borderColor: COLORS.blue, backgroundColor: COLORS.blueSoft },
  goalIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#F2F4F7',
  },
  goalIconSelected: { backgroundColor: '#D8EBFF' },
  goalCopy: { flex: 1, gap: 4 },
  goalTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  goalTitleSelected: { color: COLORS.blueDark },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goalReward: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  radio: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C7CDD6',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  radioSelected: { borderColor: COLORS.blue },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.blue },
  controlPressed: { opacity: 0.68 },
});

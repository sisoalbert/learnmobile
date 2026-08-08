import type { PropsWithChildren } from 'react';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  OnboardingHeaderMode,
  OnboardingOption,
} from '@/features/onboarding/onboarding-content';
import { feedback, type FeedbackEvent } from '@/services/feedback';

const COLORS = {
  blue: '#2289FD',
  blueDark: '#1A6ECE',
  blueSoft: '#EAF4FF',
  ink: '#2D2D2D',
  muted: '#737373',
  border: '#E2E2E2',
  surface: '#FFFFFF',
  background: '#FFFFFF',
  disabled: '#D5D5D5',
  disabledShadow: '#BDBDBD',
};

type OnboardingShellProps = PropsWithChildren<{
  headerMode: OnboardingHeaderMode;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaFeedback?: FeedbackEvent;
  onContinue?: () => void;
}>;

export function OnboardingShell({
  children,
  headerMode,
  progress,
  canGoBack,
  onBack,
  ctaLabel,
  ctaDisabled = false,
  ctaFeedback = 'buttonTap',
  onContinue,
}: OnboardingShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <OnboardingHeader
          mode={headerMode}
          progress={progress}
          canGoBack={canGoBack}
          onBack={onBack}
        />

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {ctaLabel && onContinue ? (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: ctaDisabled }}
              disabled={ctaDisabled}
              onPress={() => {
                feedback.play(ctaFeedback);
                onContinue();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                ctaDisabled && styles.primaryButtonDisabled,
                pressed && !ctaDisabled && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

type OnboardingHeaderProps = {
  mode: OnboardingHeaderMode;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
};

function OnboardingHeader({ mode, progress, canGoBack, onBack }: OnboardingHeaderProps) {
  if (mode === 'minimal') {
    return <View style={styles.minimalHeader} />;
  }

  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {canGoBack ? (
          <Pressable
            accessibilityLabel="Go to previous onboarding step"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.controlPressed]}
          >
            <Lucide name="arrow-left" size={24} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>

      {mode === 'brand' ? (
        <Text style={styles.brand}>Learn Expo</Text>
      ) : (
        <View
          accessibilityLabel={`${Math.round(progress * 100)}% of onboarding complete`}
          accessibilityRole="progressbar"
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 5)}%` }]} />
        </View>
      )}

      <View style={styles.headerSide} />
    </View>
  );
}

export function SpeechCard({ children }: PropsWithChildren) {
  return (
    <View style={styles.speechCard}>
      <Text selectable style={styles.speechText}>
        {children}
      </Text>
      <View style={styles.speechTailBorder} />
      <View style={styles.speechTail} />
    </View>
  );
}

export function RexLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      accessibilityLabel="Rex, the Learn Expo guide"
      source={require('@/assets/logo.png')}
      style={[styles.logo, compact && styles.logoCompact]}
      contentFit="contain"
    />
  );
}

export function CenteredStep({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.centeredStep, style]}>{children}</View>;
}

type OptionCardProps<T extends string | number> = {
  option: OnboardingOption<T>;
  selected: boolean;
  multiple?: boolean;
  onPress: (value: T) => void;
};

export function OptionCard<T extends string | number>({
  option,
  selected,
  multiple = false,
  onPress,
}: OptionCardProps<T>) {
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={() => {
        feedback.play('optionSelected');
        onPress(option.value);
      }}
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && styles.controlPressed,
      ]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Lucide
          name={option.icon}
          size={22}
          color={selected ? COLORS.blue : COLORS.muted}
        />
      </View>

      <View style={styles.optionCopy}>
        <View style={styles.optionTitleRow}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
            {option.label}
          </Text>
          {option.badge ? <Text style={styles.badge}>{option.badge}</Text> : null}
        </View>
        {option.description ? (
          <Text style={styles.optionDescription}>{option.description}</Text>
        ) : null}
      </View>

      <View style={[styles.selectionControl, selected && styles.selectionControlSelected]}>
        {selected ? <Lucide name="check" size={15} color={COLORS.surface} /> : null}
      </View>
    </Pressable>
  );
}

export function OptionList<T extends string | number>({
  options,
  selected,
  multiple,
  onPress,
}: {
  options: OnboardingOption<T>[];
  selected: T | T[] | null;
  multiple?: boolean;
  onPress: (value: T) => void;
}) {
  return (
    <View style={styles.optionList}>
      {options.map((option) => {
        const isSelected = Array.isArray(selected)
          ? selected.includes(option.value)
          : selected === option.value;

        return (
          <OptionCard
            key={String(option.value)}
            option={option}
            selected={isSelected}
            multiple={multiple}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

export function SupportingText({ children }: PropsWithChildren) {
  return (
    <Text selectable style={styles.supportingText}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return (
    <Text selectable style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

export function LoadingBar() {
  return (
    <View accessibilityLabel="Building your learning path" accessibilityRole="progressbar" style={styles.loadingTrack}>
      <View style={styles.loadingFill} />
    </View>
  );
}

export function ReminderChoice({
  value,
  selected,
  label,
  onPress,
}: {
  value: 'enabled' | 'disabled';
  selected: boolean;
  label: string;
  onPress: (value: 'enabled' | 'disabled') => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        feedback.play('optionSelected');
        onPress(value);
      }}
      style={({ pressed }) => [
        styles.reminderChoice,
        selected && styles.reminderChoiceSelected,
        pressed && styles.controlPressed,
      ]}
    >
      <Text style={[styles.reminderChoiceText, selected && styles.reminderChoiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function InfoCard({
  icon,
  title,
  description,
}: {
  icon: LucideIconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Lucide name={icon} size={25} color={COLORS.blue} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
      </View>
    </View>
  );
}

export function NotificationCard({ children }: PropsWithChildren) {
  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationHeading}>
        <View style={styles.notificationIcon}>
          <Lucide name="bell" size={20} color={COLORS.ink} />
        </View>
        <Text style={styles.notificationTitle}>“Learn Expo” Would Like to Send You Notifications</Text>
      </View>
      <Text style={styles.notificationDescription}>
        Notifications may include learning reminders and progress updates. You can change access
        later in your device settings.
      </Text>
      <View style={styles.notificationActions}>{children}</View>
    </View>
  );
}

export function CourseCard({ items }: { items: string[] }) {
  return (
    <View style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <Lucide name="triangle" size={30} color={COLORS.blue} />
        <Text style={styles.courseTitle}>Expo Foundations</Text>
      </View>
      <View style={styles.courseItems}>
        {items.map((item) => (
          <View key={item} style={styles.courseItem}>
            <Lucide name="circle-check" size={18} color={COLORS.blue} />
            <Text style={styles.courseItemText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  minimalHeader: {
    height: 24,
  },
  headerSide: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  brand: {
    flex: 1,
    color: COLORS.blue,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#ECECEC',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.blue,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
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
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  centeredStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  speechCard: {
    maxWidth: 420,
    minWidth: 220,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  speechText: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    textAlign: 'center',
  },
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
  logo: {
    width: 190,
    height: 190,
  },
  logoCompact: {
    width: 155,
    height: 155,
  },
  supportingText: {
    maxWidth: 440,
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 31,
    textAlign: 'center',
  },
  optionList: {
    width: '100%',
    gap: 10,
  },
  optionCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  optionCardSelected: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
  },
  optionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F4F4F4',
  },
  optionIconSelected: {
    backgroundColor: '#DCEEFF',
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionLabel: {
    flexShrink: 1,
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  optionLabelSelected: {
    color: COLORS.blueDark,
  },
  optionDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    color: COLORS.surface,
    backgroundColor: COLORS.blue,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  selectionControl: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CFCFCF',
    borderRadius: 11,
    backgroundColor: COLORS.surface,
  },
  selectionControlSelected: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blue,
  },
  controlPressed: {
    opacity: 0.68,
  },
  loadingTrack: {
    width: '100%',
    maxWidth: 360,
    height: 10,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#ECECEC',
  },
  loadingFill: {
    width: '70%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.blue,
  },
  reminderChoice: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  reminderChoiceSelected: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
  },
  reminderChoiceText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  reminderChoiceTextSelected: {
    color: COLORS.blueDark,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 15,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  infoIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.blueSoft,
  },
  infoCopy: {
    flex: 1,
    gap: 3,
  },
  infoTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  infoDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  notificationCard: {
    width: '100%',
    maxWidth: 430,
    gap: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
  },
  notificationHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F2F2F2',
  },
  notificationTitle: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  notificationDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  courseCard: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    backgroundColor: COLORS.blueSoft,
  },
  courseTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  courseItems: {
    gap: 13,
    padding: 18,
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  courseItemText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 20,
  },
});

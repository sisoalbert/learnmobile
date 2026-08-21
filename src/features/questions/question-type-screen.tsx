import { Lucide } from '@react-native-vector-icons/lucide';
import React, { useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pressable, ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  QUESTION_COLORS,
  QUESTION_INPUT_ACCESSORY_ID,
  QUESTION_TYPE_META,
} from './question-constants';
import { QuestionInteraction } from './question-components';
import { answerMatchesQuestion, gradeQuestion, isAnswerComplete } from './question-engine';
import { getLessonQuestionProgressPercent } from './lesson-progress';
import { RuleList } from './question-ui';
import type {
  CustomValidatorRegistry,
  LocalQuestionResult,
  Question,
  QuestionAnswer,
} from './questions.types';
import { feedback } from '@/services/feedback';
import { AdMobBanner, useInLessonAdsEnabled } from '@/services/ads';
import { useSessionStore } from '@/state/sessionStore';

export type QuestionTypeScreenProps = {
  question: Question;
  initialAnswer?: QuestionAnswer;
  sequence?: { index: number; total: number };
  onAnswerChange?: (answer: QuestionAnswer) => void;
  onResult?: (result: LocalQuestionResult) => void;
  onSubmitAnswer?: (answer: QuestionAnswer) => Promise<LocalQuestionResult>;
  onContinue?: (result: LocalQuestionResult) => void;
  onBack?: () => void;
  customValidators?: CustomValidatorRegistry;
  showInLessonAd?: boolean;
};

export function QuestionTypeScreen({
  question,
  ...props
}: QuestionTypeScreenProps) {
  return <QuestionTypeScreenContent key={question.id} question={question} {...props} />;
}

function QuestionTypeScreenContent({
  question,
  initialAnswer,
  sequence,
  onAnswerChange,
  onResult,
  onSubmitAnswer,
  onContinue,
  onBack,
  customValidators = {},
  showInLessonAd = false,
}: QuestionTypeScreenProps) {
  const [answer, setAnswer] = useState<QuestionAnswer | undefined>(initialAnswer);
  const [result, setResult] = useState<LocalQuestionResult>();
  const [visibleHintIds, setVisibleHintIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const plan = useSessionStore((state) => state.user?.plan ?? 'free');
  const inLessonAdsEnabled = useInLessonAdsEnabled();
  const shouldShowBanner = process.env.EXPO_OS === 'web'
    || (showInLessonAd && inLessonAdsEnabled === true);
  const meta = QUESTION_TYPE_META[question.type];
  const invalidInitialAnswer = !answerMatchesQuestion(question, initialAnswer);

  const changeAnswer = (next: QuestionAnswer) => {
    setAnswer(next);
    onAnswerChange?.(next);
  };
  const check = async () => {
    if (!answer || !isAnswerComplete(question, answer) || isSubmitting) return;
    setSubmissionError('');
    setIsSubmitting(true);
    try {
      const nextResult = onSubmitAnswer
        ? await onSubmitAnswer(answer)
        : gradeQuestion(question, answer, customValidators);
      setResult(nextResult);
      setAttempts((value) => value + 1);
      feedback.play(nextResult.status === 'correct' ? 'correctAnswer' : 'incorrectAnswer');
      onResult?.(nextResult);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Unable to check this answer.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const retry = () => {
    setAnswer(undefined);
    setResult(undefined);
    setSubmissionError('');
    setInitializationAttempt((value) => value + 1);
  };
  const showHint = () => {
    const nextHint = question.hints?.find((hint) => !visibleHintIds.includes(hint.id));
    if (nextHint) setVisibleHintIds((ids) => [...ids, nextHint.id]);
  };

  if (invalidInitialAnswer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorPage}>
          <Lucide name="triangle-alert" size={34} color={QUESTION_COLORS.red} />
          <Text selectable style={styles.errorTitle}>This answer cannot be opened</Text>
          <Text selectable style={styles.errorBody}>Answer type “{initialAnswer?.type}” does not match “{question.type}”.</Text>
          {onBack ? <PrimaryButton label="Go back" onPress={onBack} /> : null}
        </View>
      </SafeAreaView>
    );
  }

  const complete = isAnswerComplete(question, answer);
  const feedbackColor = result?.status === 'correct' ? QUESTION_COLORS.green : result?.status === 'partially_correct' ? QUESTION_COLORS.amber : QUESTION_COLORS.red;
  const feedbackBackground = result?.status === 'correct' ? QUESTION_COLORS.greenSoft : result?.status === 'partially_correct' ? '#FFF7E6' : QUESTION_COLORS.redSoft;
  const progressPercent = sequence
    ? getLessonQuestionProgressPercent(sequence.index, sequence.total)
    : 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.page}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to question types" accessibilityRole="button" hitSlop={8} onPress={() => {
            feedback.play('buttonTap');
            onBack?.();
          }} style={styles.headerButton}>
            <Lucide name="x" size={24} color={QUESTION_COLORS.muted} />
          </Pressable>
          <View
            accessibilityLabel={sequence ? `${sequence.index} of ${sequence.total}` : undefined}
            accessibilityRole="progressbar"
            accessibilityValue={sequence ? {
              min: 0,
              max: 100,
              now: progressPercent,
              text: `${progressPercent}% complete`,
            } : undefined}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: meta.color }]} />
          </View>
          <View style={styles.xpPill}><Lucide name="zap" size={15} color="#F59E0B" /><Text selectable style={styles.xpText}>{question.xp} XP</Text></View>
        </View>

        <ScrollView
          accessibilityLabel="Question content"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.typePill, { backgroundColor: meta.softColor }]}>
            <View style={[styles.typeNumber, { backgroundColor: meta.color }]}><Text selectable style={styles.typeNumberText}>{(sequence?.index ?? 1).toString()}</Text></View>
            <Text selectable style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <View style={styles.promptGroup}>
            <Text selectable style={styles.title}>{question.title}</Text>
            <Text selectable style={styles.prompt}>{question.prompt}</Text>
            {question.instruction ? <Text selectable style={styles.instruction}>{question.instruction}</Text> : null}
          </View>

          <QuestionInteraction question={question} answer={answer} disabled={Boolean(result)} initializationAttempt={initializationAttempt} onAnswerChange={changeAnswer} customValidators={customValidators} />

          {question.hints?.length ? (
            <View style={styles.hints}>
              {visibleHintIds.map((id) => {
                const hint = question.hints?.find((candidate) => candidate.id === id);
                return hint ? <View key={id} style={styles.hintCard}><Lucide name="lightbulb" size={18} color="#C67B05" /><Text selectable style={styles.hintText}>{hint.text}{hint.penalty ? ` (−${hint.penalty} XP)` : ''}</Text></View> : null;
              })}
              {visibleHintIds.length < question.hints.length && !result ? <Pressable accessibilityRole="button" onPress={() => {
                feedback.play('buttonTap');
                showHint();
              }} style={styles.hintButton}><Lucide name="lightbulb" size={17} color={QUESTION_COLORS.muted} /><Text selectable style={styles.hintButtonText}>Show a hint</Text></Pressable> : null}
            </View>
          ) : null}

          {result ? (
            <View accessibilityLiveRegion="polite" style={[styles.feedback, { backgroundColor: feedbackBackground, borderColor: feedbackColor }]}>
              <View style={styles.feedbackHeading}>
                <Lucide name={result.status === 'correct' ? 'circle-check' : result.status === 'partially_correct' ? 'circle-dot' : result.status === 'error' ? 'triangle-alert' : 'circle-x'} size={25} color={feedbackColor} />
                <View style={styles.feedbackCopy}>
                  <Text selectable style={[styles.feedbackTitle, { color: feedbackColor }]}>{result.status === 'correct' ? 'Excellent!' : result.status === 'partially_correct' ? 'Almost there' : result.status === 'error' ? 'Preview needs attention' : 'Not quite yet'}</Text>
                  <Text selectable style={styles.feedbackScore}>{result.score}/{result.maximumScore} points · Attempt {attempts}</Text>
                </View>
              </View>
              {result.validationErrors.map((error) => <Text selectable key={error} style={styles.validationError}>{error}</Text>)}
              {result.ruleOutcomes.length > 1 ? <RuleList outcomes={result.ruleOutcomes} /> : null}
              {question.explanation ? <View style={styles.explanation}><Text selectable style={styles.explanationTitle}>Why?</Text><Text selectable style={styles.explanationText}>{question.explanation.summary}</Text>{question.explanation.details ? <Text selectable style={styles.explanationText}>{question.explanation.details}</Text> : null}</View> : null}
            </View>
          ) : null}
          {submissionError ? <Text accessibilityRole="alert" selectable style={styles.submissionError}>{submissionError}</Text> : null}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {plan !== 'premium' && shouldShowBanner ? <AdMobBanner key={question.id} /> : null}

        <View style={styles.footer}>
          {result ? (
            result.status === 'correct'
              ? <PrimaryButton label="Continue" onPress={() => onContinue?.(result)} />
              : <PrimaryButton label="Try again" onPress={retry} color={feedbackColor} />
          ) : <PrimaryButton label={isSubmitting ? 'Checking…' : 'Check answer'} disabled={!complete || isSubmitting} onPress={() => void check()} />}
        </View>
      </KeyboardAvoidingView>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={QUESTION_INPUT_ACCESSORY_ID}>
          <View style={styles.keyboardAccessory}>
            <Pressable
              accessibilityLabel="Dismiss keyboard"
              accessibilityRole="button"
              hitSlop={8}
              onPress={Keyboard.dismiss}
              style={({ pressed }) => [styles.keyboardAccessoryButton, pressed && styles.keyboardAccessoryButtonPressed]}
            >
              <Text style={styles.keyboardAccessoryButtonText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
  );
}

function PrimaryButton({ label, disabled, color = QUESTION_COLORS.blue, onPress }: { label: string; disabled?: boolean; color?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} hitSlop={4} onPress={() => {
      Keyboard.dismiss();
      feedback.play('buttonTap');
      onPress?.();
    }} style={({ pressed }) => [styles.primaryButton, { backgroundColor: disabled ? '#D8DCE3' : color, boxShadow: disabled ? '0 4px 0 #BEC3CC' : `0 4px 0 ${color === QUESTION_COLORS.blue ? QUESTION_COLORS.blueDark : color}` }, pressed && !disabled && styles.buttonPressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: QUESTION_COLORS.background },
  page: { flex: 1, width: '100%', maxWidth: 700, alignSelf: 'center', backgroundColor: QUESTION_COLORS.background },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  progressTrack: { flex: 1, height: 9, overflow: 'hidden', borderRadius: 999, backgroundColor: '#E2E5EA' },
  progressFill: { height: '100%', borderRadius: 999 },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FFF7E4' },
  xpText: { color: '#A66200', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 20 },
  typePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingRight: 12, borderRadius: 999 },
  typeNumber: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  typeNumberText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  typeLabel: { fontSize: 13, fontWeight: '800' },
  promptGroup: { gap: 8 },
  title: { color: QUESTION_COLORS.ink, fontSize: 25, fontWeight: '800', lineHeight: 31 },
  prompt: { color: QUESTION_COLORS.ink, fontSize: 18, fontWeight: '600', lineHeight: 27 },
  instruction: { color: QUESTION_COLORS.muted, fontSize: 14, lineHeight: 21 },
  hints: { gap: 8 },
  hintCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 13, backgroundColor: '#FFF7E4' },
  hintText: { flex: 1, color: '#7C510A', fontSize: 13, lineHeight: 19 },
  hintButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: '#ECEFF3' },
  hintButtonText: { color: QUESTION_COLORS.muted, fontSize: 13, fontWeight: '700' },
  feedback: { gap: 13, padding: 16, borderWidth: 1.5, borderRadius: 18, borderCurve: 'continuous' },
  feedbackHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedbackCopy: { flex: 1, gap: 2 },
  feedbackTitle: { fontSize: 19, fontWeight: '800' },
  feedbackScore: { color: QUESTION_COLORS.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  validationError: { color: QUESTION_COLORS.red, fontFamily: 'monospace', fontSize: 12 },
  submissionError: { color: QUESTION_COLORS.red, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  explanation: { gap: 5, paddingTop: 2 },
  explanationTitle: { color: QUESTION_COLORS.ink, fontSize: 13, fontWeight: '800' },
  explanationText: { color: QUESTION_COLORS.muted, fontSize: 13, lineHeight: 19 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: QUESTION_COLORS.border, backgroundColor: QUESTION_COLORS.surface },
  primaryButton: { width: '100%', minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16, borderCurve: 'continuous' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  buttonPressed: { transform: [{ translateY: 2 }], opacity: 0.88 },
  bottomSpacer: { height: 8 },
  keyboardAccessory: { minHeight: 44, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: QUESTION_COLORS.border, backgroundColor: QUESTION_COLORS.surface },
  keyboardAccessoryButton: { minWidth: 60, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  keyboardAccessoryButtonPressed: { backgroundColor: '#E9EDF3' },
  keyboardAccessoryButtonText: { color: QUESTION_COLORS.blue, fontSize: 16, fontWeight: '700' },
  errorPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28 },
  errorTitle: { color: QUESTION_COLORS.ink, fontSize: 23, fontWeight: '800', textAlign: 'center' },
  errorBody: { color: QUESTION_COLORS.muted, fontSize: 15, textAlign: 'center' },
});

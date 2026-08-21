import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { isInvalidLearnerCredential } from '@/features/learning-session/guest-session-errors';
import { QuestionTypeScreen } from '@/features/questions/question-type-screen';
import type { LocalQuestionResult, Question, QuestionAnswer } from '@/features/questions/questions.types';
import { useLearnerSessionStore } from '@/state/learner-session-store';
import { type LessonSummary, useLessonResultsStore } from '@/state/lesson-results-store';
import { isFirstLesson } from './lesson-constants';

function uniqueKey(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}:${random}`;
}

export function BackendLessonScreen({ lessonKey }: { lessonKey: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const lesson = useQuery(api.content.getLesson, { lessonKey });
  const learnerSession = useLearnerSessionStore((state) => state.session);
  const hasLearnerHydrated = useLearnerSessionStore((state) => state.hasHydrated);
  const clearLearnerSession = useLearnerSessionStore((state) => state.clearSession);
  const hasResultsHydrated = useLessonResultsStore((state) => state.hasHydrated);
  const currentQuestionIndex = useLessonResultsStore((state) => state.currentQuestionIndex);
  const startBackendLesson = useLessonResultsStore((state) => state.startBackendLesson);
  const recordResult = useLessonResultsStore((state) => state.recordResult);
  const advanceQuestion = useLessonResultsStore((state) => state.advanceQuestion);
  const setServerSummary = useLessonResultsStore((state) => state.setServerSummary);
  const resetLesson = useLessonResultsStore((state) => state.resetLesson);
  const startAuthenticated = useMutation(api.learning.startAuthenticatedAttempt);
  const startGuest = useMutation(api.learning.startGuestAttempt);
  const submitAuthenticated = useMutation(api.learning.submitAuthenticatedExercise);
  const submitGuest = useMutation(api.learning.submitGuestExercise);
  const completeAuthenticated = useMutation(api.learning.completeAuthenticatedAttempt);
  const completeGuest = useMutation(api.learning.completeGuestAttempt);
  const [attemptId, setAttemptId] = useState<Id<'lessonAttempts'>>();
  const [startError, setStartError] = useState('');
  const clientAttemptKey = useRef(uniqueKey(`lesson:${lessonKey}`));
  const questionStartedAt = useRef(0);

  const questions = useMemo(
    () => lesson?.exercises.map((exercise) => exercise.question as unknown as Question) ?? [],
    [lesson],
  );
  const question = questions[currentQuestionIndex];
  const exercise = lesson?.exercises[currentQuestionIndex];

  useEffect(() => {
    if (!lesson || !hasResultsHydrated) return;
    startBackendLesson(lesson.key);
  }, [hasResultsHydrated, lesson, startBackendLesson]);

  useEffect(() => {
    if (!lesson || attemptId || authLoading || !hasLearnerHydrated) return;
    if (!isAuthenticated && !learnerSession) return;
    let active = true;
    const request = isAuthenticated
      ? startAuthenticated({ lessonKey: lesson.key, clientAttemptKey: clientAttemptKey.current })
      : startGuest({ ...learnerSession!, lessonKey: lesson.key, clientAttemptKey: clientAttemptKey.current });
    void request.then((result) => {
      if (active) setAttemptId(result.attemptId);
    }).catch((error) => {
      if (!active) return;
      if (isInvalidLearnerCredential(error)) {
        resetLesson();
        clearLearnerSession();
        router.replace('/home');
        return;
      }
      setStartError('Unable to start this lesson. Check your connection and try again.');
    });
    return () => { active = false; };
  }, [attemptId, authLoading, clearLearnerSession, hasLearnerHydrated, isAuthenticated, learnerSession, lesson, resetLesson, router, startAuthenticated, startGuest]);

  useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [currentQuestionIndex]);

  if (lesson === undefined || authLoading || !hasLearnerHydrated || !hasResultsHydrated || (!isAuthenticated && !learnerSession)) {
    return <LessonLoading message="Preparing your learning session…" />;
  }
  if (lesson === null) return <LessonLoading message="This lesson is not available." />;
  if (startError) return <LessonLoading message={startError} />;
  if (!attemptId || !question || !exercise) return <LessonLoading message="Opening your lesson…" />;

  const submitAnswer = async (answer: QuestionAnswer): Promise<LocalQuestionResult> => {
    const common = {
      attemptId,
      exerciseKey: exercise.key,
      answer,
      idempotencyKey: uniqueKey(`${attemptId}:${exercise.key}`),
      responseTimeMs: Math.max(0, Date.now() - questionStartedAt.current),
    };
    try {
      const result = isAuthenticated
        ? await submitAuthenticated(common)
        : await submitGuest({ ...learnerSession!, ...common });
      return result as unknown as LocalQuestionResult;
    } catch (error) {
      if (isInvalidLearnerCredential(error)) {
        resetLesson();
        clearLearnerSession();
        router.replace('/home');
        throw new Error('Restoring your learning session…');
      }
      throw new Error('Unable to check this answer. Check your connection and try again.');
    }
  };

  const continueLesson = async () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      advanceQuestion(nextIndex);
      return;
    }
    try {
      const result = isAuthenticated
        ? await completeAuthenticated({ attemptId })
        : await completeGuest({ ...learnerSession!, attemptId });
      setServerSummary(result as LessonSummary);
      router.replace('/lessons/results' as never);
    } catch (error) {
      if (isInvalidLearnerCredential(error)) {
        resetLesson();
        clearLearnerSession();
        router.replace('/home');
        return;
      }
      setStartError('Unable to finish this lesson. Check your connection and try again.');
    }
  };

  return (
    <QuestionTypeScreen
      question={question}
      sequence={{ index: currentQuestionIndex + 1, total: questions.length }}
      onBack={() => router.replace('/home')}
      showInLessonAd={!isFirstLesson(lesson.key)}
      onSubmitAnswer={submitAnswer}
      onResult={(result) => recordResult(question, result)}
      onContinue={() => void continueLesson()}
    />
  );
}

function LessonLoading({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.loading}>
      <ActivityIndicator color="#2289FD" size="large" />
      <Text selectable style={styles.loadingText}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: '#FFFFFF' },
  loadingText: { color: '#667085', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});

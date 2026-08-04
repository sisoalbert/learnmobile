import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocalQuestionResult, Question } from '@/features/questions/questions.types';
import {
  formatLessonDuration,
  useLessonResultsStore,
} from '@/state/lesson-results-store';

const firstQuestion = {
  id: 'q1',
  type: 'multiple_choice',
  title: 'One',
  prompt: 'Pick one',
  difficulty: 'beginner',
  topic: 'test',
  xp: 10,
  status: 'published',
  version: 1,
  options: [{ id: 'a', text: 'A' }],
  correctOptionId: 'a',
} satisfies Question;

const secondQuestion = {
  ...firstQuestion,
  id: 'q2',
  title: 'Two',
  xp: 15,
} satisfies Question;

const result = (score: number, maximumScore: number, status: LocalQuestionResult['status']) => ({
  answer: { type: 'multiple_choice', answer: { selectedOptionId: 'a' } } as const,
  status,
  score,
  maximumScore,
  ruleOutcomes: [],
  validationErrors: [],
});

describe('lesson results store', () => {
  beforeEach(() => {
    useLessonResultsStore.getState().resetLesson();
    useLessonResultsStore.setState({ hasHydrated: true });
  });

  test('uses first attempts for score, accuracy, and proportional XP', () => {
    const store = useLessonResultsStore.getState();
    store.startLesson(1_000);
    store.recordResult(firstQuestion, result(1, 1, 'correct'), 2_000);
    store.recordResult(secondQuestion, result(1, 3, 'partially_correct'), 3_000);
    store.recordResult(secondQuestion, result(3, 3, 'correct'), 4_000);

    const summary = store.completeLesson([firstQuestion, secondQuestion], 171_000);

    expect(summary).toEqual({
      lessonId: 'first-lesson',
      score: 2,
      maximumScore: 4,
      earnedXp: 15,
      maximumXp: 25,
      accuracyPercent: 50,
      durationSeconds: 170,
      completedAt: 171_000,
    });
    expect(useLessonResultsStore.getState().questionResults.q2.attempts).toHaveLength(2);
  });

  test('resumes an incomplete attempt and starts fresh after completion', () => {
    const store = useLessonResultsStore.getState();
    store.startLesson(1_000);
    store.advanceQuestion(1);
    store.startLesson(9_000);

    expect(useLessonResultsStore.getState()).toMatchObject({
      startedAt: 1_000,
      currentQuestionIndex: 1,
    });

    store.recordResult(firstQuestion, result(1, 1, 'correct'), 10_000);
    store.completeLesson([firstQuestion], 11_000);
    useLessonResultsStore.getState().startLesson(20_000);

    expect(useLessonResultsStore.getState()).toMatchObject({
      startedAt: 20_000,
      completedAt: null,
      currentQuestionIndex: 0,
      questionResults: {},
    });
    expect(useLessonResultsStore.getState().latestSummary?.completedAt).toBe(11_000);
  });

  test('formats completion time as minutes and zero-padded seconds', () => {
    expect(formatLessonDuration(169)).toBe('2:49');
    expect(formatLessonDuration(5)).toBe('0:05');
  });

  test('rehydrates an incomplete lesson attempt from local storage', async () => {
    await AsyncStorage.setItem(
      'learn-expo:lesson-results',
      JSON.stringify({
        version: 1,
        state: {
          lessonId: 'first-lesson',
          currentQuestionIndex: 4,
          startedAt: 5_000,
          completedAt: null,
          questionResults: {},
          latestSummary: null,
        },
      }),
    );

    await useLessonResultsStore.persist.rehydrate();

    expect(useLessonResultsStore.getState()).toMatchObject({
      hasHydrated: true,
      currentQuestionIndex: 4,
      startedAt: 5_000,
      completedAt: null,
    });
  });
});

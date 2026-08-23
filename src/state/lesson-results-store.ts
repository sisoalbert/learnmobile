import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LocalQuestionResult, Question } from '@/features/questions/questions.types';
import type { Id } from '../../convex/_generated/dataModel';

export const FIRST_LESSON_ID = 'first-lesson';

export type LessonQuestionAttempt = {
  checkedAt: number;
  result: LocalQuestionResult;
};

export type LessonQuestionProgress = {
  questionId: string;
  xpAvailable: number;
  attempts: LessonQuestionAttempt[];
};

export type LessonSummary = {
  attemptId?: Id<'lessonAttempts'>;
  lessonId: string;
  score: number;
  maximumScore: number;
  earnedXp: number;
  maximumXp: number;
  accuracyPercent: number;
  durationSeconds: number;
  completedAt: number;
  heartsRemaining?: number;
  totalXp?: number;
  streakDays?: number;
  completedLessons?: number;
  nextLessonKey?: string | null;
  weeklyActivityDateKeys?: string[];
  monthlyQuest?: {
    monthKey: string;
    questPoints: number;
    questTarget: number;
    lessonsCompleted: number;
    lessonsTarget: number;
    highAccuracyLessons: number;
    highAccuracyTarget: number;
    streakExtensions: number;
    streakTarget: number;
  };
  reward?: {
    questPointsEarned: number;
    gemsAvailable: number;
    claimed: boolean;
    totalGems: number;
  };
};

export type ClaimedLessonReward = {
  gemsEarned: number;
  totalGems: number;
  alreadyClaimed: boolean;
};

export type LessonResultsState = {
  hasHydrated: boolean;
  lessonId: string;
  currentQuestionIndex: number;
  startedAt: number | null;
  completedAt: number | null;
  questionResults: Record<string, LessonQuestionProgress>;
  latestSummary: LessonSummary | null;
  claimedReward: ClaimedLessonReward | null;
  startLesson: (startedAt?: number) => void;
  startBackendLesson: (lessonId: string, startedAt?: number) => void;
  recordResult: (question: Question, result: LocalQuestionResult, checkedAt?: number) => void;
  advanceQuestion: (nextQuestionIndex: number) => void;
  completeLesson: (questions: Question[], completedAt?: number) => LessonSummary;
  setServerSummary: (summary: LessonSummary) => void;
  setClaimedReward: (reward: ClaimedLessonReward) => void;
  resetLesson: () => void;
  setHasHydrated: (value: boolean) => void;
};

const initialAttempt = {
  lessonId: FIRST_LESSON_ID,
  currentQuestionIndex: 0,
  startedAt: null as number | null,
  completedAt: null as number | null,
  questionResults: {} as Record<string, LessonQuestionProgress>,
};

export const formatLessonDuration = (durationSeconds: number) => {
  const safeDuration = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(safeDuration / 60);
  const seconds = safeDuration % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const useLessonResultsStore = create<LessonResultsState>()(
  persist(
    (set, get) => ({
      ...initialAttempt,
      hasHydrated: false,
      latestSummary: null,
      claimedReward: null,
      startLesson: (startedAt = Date.now()) => {
        const state = get();

        if (state.startedAt !== null && state.completedAt === null) return;

        set({
          ...initialAttempt,
          startedAt,
          latestSummary: state.latestSummary,
          claimedReward: null,
        });
      },
      startBackendLesson: (lessonId, startedAt = Date.now()) => {
        const state = get();
        set({
          ...initialAttempt,
          lessonId,
          startedAt,
          latestSummary: state.latestSummary,
          claimedReward: null,
        });
      },
      recordResult: (question, result, checkedAt = Date.now()) =>
        set((state) => {
          const progress = state.questionResults[question.id] ?? {
            questionId: question.id,
            xpAvailable: question.xp,
            attempts: [],
          };

          return {
            questionResults: {
              ...state.questionResults,
              [question.id]: {
                ...progress,
                xpAvailable: question.xp,
                attempts: [...progress.attempts, { checkedAt, result }],
              },
            },
          };
        }),
      advanceQuestion: (currentQuestionIndex) => set({ currentQuestionIndex }),
      completeLesson: (questions, completedAt = Date.now()) => {
        const state = get();
        const firstResults = questions.map((question) => ({
          question,
          result: state.questionResults[question.id]?.attempts[0]?.result,
        }));
        const score = firstResults.reduce((total, entry) => total + (entry.result?.score ?? 0), 0);
        const maximumScore = firstResults.reduce(
          (total, entry) => total + (entry.result?.maximumScore ?? 0),
          0,
        );
        const earnedXp = Math.round(
          firstResults.reduce((total, entry) => {
            if (!entry.result || entry.result.maximumScore <= 0) return total;
            return total + entry.question.xp * (entry.result.score / entry.result.maximumScore);
          }, 0),
        );
        const maximumXp = questions.reduce((total, question) => total + question.xp, 0);
        const summary: LessonSummary = {
          lessonId: state.lessonId,
          score,
          maximumScore,
          earnedXp,
          maximumXp,
          accuracyPercent: maximumScore > 0 ? Math.round((score / maximumScore) * 100) : 0,
          durationSeconds: Math.max(
            0,
            Math.floor((completedAt - (state.startedAt ?? completedAt)) / 1000),
          ),
          completedAt,
        };

        set({ completedAt, latestSummary: summary });
        return summary;
      },
      setServerSummary: (summary) => set({
        lessonId: summary.lessonId,
        completedAt: summary.completedAt,
        latestSummary: summary,
        claimedReward: null,
      }),
      setClaimedReward: (claimedReward) => set({ claimedReward }),
      resetLesson: () => set({ ...initialAttempt, latestSummary: null, claimedReward: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'learn-expo:lesson-results',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lessonId: state.lessonId,
        currentQuestionIndex: state.currentQuestionIndex,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        questionResults: state.questionResults,
        latestSummary: state.latestSummary,
        claimedReward: state.claimedReward,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

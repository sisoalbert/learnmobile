import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { firstLessonQuestions } from '@/content/questions';
import { QuestionTypeScreen } from '@/features/questions/question-type-screen';
import { useLessonResultsStore } from '@/state/lesson-results-store';

export default function FirstLessonScreen() {
  const router = useRouter();
  const hasHydrated = useLessonResultsStore((state) => state.hasHydrated);
  const questionIndex = useLessonResultsStore((state) => state.currentQuestionIndex);
  const startLesson = useLessonResultsStore((state) => state.startLesson);
  const recordResult = useLessonResultsStore((state) => state.recordResult);
  const advanceQuestion = useLessonResultsStore((state) => state.advanceQuestion);
  const completeLesson = useLessonResultsStore((state) => state.completeLesson);
  const question = firstLessonQuestions[questionIndex];

  useEffect(() => {
    if (hasHydrated) startLesson();
  }, [hasHydrated, startLesson]);

  if (!hasHydrated || !question) return null;

  return (
    <QuestionTypeScreen
      question={question}
      sequence={{ index: questionIndex + 1, total: firstLessonQuestions.length }}
      onBack={() => router.replace('/home')}
      onResult={(result) => recordResult(question, result)}
      onContinue={() => {
        const nextIndex = questionIndex + 1;

        if (nextIndex === firstLessonQuestions.length) {
          completeLesson(firstLessonQuestions);
          router.replace('/lessons/complete' as never);
          return;
        }

        advanceQuestion(nextIndex);
      }}
    />
  );
}

import { useRouter } from 'expo-router';
import { useState } from 'react';

import { firstLessonQuestions } from '@/content/questions';
import { QuestionTypeScreen } from '@/features/questions/question-type-screen';

export default function FirstLessonScreen() {
  const router = useRouter();
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = firstLessonQuestions[questionIndex];

  return (
    <QuestionTypeScreen
      question={question}
      sequence={{ index: questionIndex + 1, total: firstLessonQuestions.length }}
      onBack={() => router.replace('/home')}
      onContinue={() => {
        const nextIndex = questionIndex + 1;

        if (nextIndex === firstLessonQuestions.length) {
          router.replace('/lessons/complete' as never);
          return;
        }

        setQuestionIndex(nextIndex);
      }}
    />
  );
}

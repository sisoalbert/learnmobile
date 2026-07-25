import { Redirect, router } from 'expo-router';
import React from 'react';

import { goBackOrReplace } from '@/navigation/go-back-or-replace';

import { QUESTION_TYPES } from './question-constants';
import { QUESTION_FIXTURES_BY_TYPE, isQuestionType } from './question-fixtures';
import { QuestionTypeScreen } from './question-type-screen';

export default function QuestionSampleScreen({ type }: { type: string }) {
  if (!isQuestionType(type)) {
    return <Redirect href={'/question-types' as never} />;
  }
  const index = QUESTION_TYPES.indexOf(type);
  const question = QUESTION_FIXTURES_BY_TYPE[type];
  return (
    <QuestionTypeScreen
      key={type}
      question={question}
      sequence={{ index: index + 1, total: QUESTION_TYPES.length }}
      onBack={() => goBackOrReplace('/question-types')}
      onContinue={() => {
        const next = QUESTION_TYPES[index + 1];
        if (next) router.replace({ pathname: '/question-types/[type]', params: { type: next } } as never);
        else router.replace('/question-types' as never);
      }}
    />
  );
}

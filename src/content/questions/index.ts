import gettingStarted from './beginner/course-1-getting-started.json';
import reactNativeFundamentals from './beginner/course-2-react-native-fundamentals.json';
import layoutAndStyling from './beginner/course-3-layout-and-styling.json';
import componentsAndState from './beginner/course-4-components-and-state.json';
import navigationBasics from './beginner/course-5-navigation-basics.json';

import type { Question } from '@/features/questions/questions.types';

export const bundledQuestionsByCourse = {
  'beginner-course-1': gettingStarted,
  'beginner-course-2': reactNativeFundamentals,
  'beginner-course-3': layoutAndStyling,
  'beginner-course-4': componentsAndState,
  'beginner-course-5': navigationBasics,
} as const;

export const bundledQuestions = [
  ...gettingStarted,
  ...reactNativeFundamentals,
  ...layoutAndStyling,
  ...componentsAndState,
  ...navigationBasics,
];

const firstLessonQuestionIds = [
  'beginner-c1-l1-mc-001',
  'beginner-c1-l1-ms-001',
  'beginner-c1-l2-fb-001',
  'beginner-c1-l2-ao-001',
  'beginner-c1-l3-tf-001',
  'beginner-c1-l3-ic-001',
  'beginner-c2-l1-mp-001',
  'beginner-c2-l1-ms-001',
  'beginner-c2-l2-fb-001',
] as const;

export const firstLessonQuestions = firstLessonQuestionIds.map((id) => {
  const question = bundledQuestions.find((candidate) => candidate.id === id);

  if (!question) {
    throw new Error(`Missing bundled first-lesson question: ${id}`);
  }

  return question;
}) as unknown as Question[];

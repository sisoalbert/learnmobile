import gettingStarted from '../src/content/questions/beginner/course-1-getting-started.json';
import reactNativeFundamentals from '../src/content/questions/beginner/course-2-react-native-fundamentals.json';
import layoutAndStyling from '../src/content/questions/beginner/course-3-layout-and-styling.json';
import componentsAndState from '../src/content/questions/beginner/course-4-components-and-state.json';
import navigationBasics from '../src/content/questions/beginner/course-5-navigation-basics.json';

type SeedQuestion = Record<string, unknown> & {
  id: string;
  type: string;
  courseId: string;
  lessonId: string;
  title: string;
  prompt: string;
  xp: number;
  status: 'draft' | 'published' | 'archived';
  version: number;
};

export const COURSE_SEEDS = [
  {
    key: 'beginner-course-1',
    title: 'Getting Started',
    description: 'Set up Expo and understand the development workflow.',
    subject: 'Expo',
  },
  {
    key: 'beginner-course-2',
    title: 'React Native Fundamentals',
    description: 'Learn the essential primitives used by React Native apps.',
    subject: 'React Native',
  },
  {
    key: 'beginner-course-3',
    title: 'Layout & Styling',
    description: 'Build responsive interfaces with React Native styling and Flexbox.',
    subject: 'React Native styling',
  },
  {
    key: 'beginner-course-4',
    title: 'Components & State',
    description: 'Compose reusable components and manage interactive state.',
    subject: 'React',
  },
  {
    key: 'beginner-course-5',
    title: 'Navigation Basics',
    description: 'Create multi-screen experiences with Expo Router.',
    subject: 'Expo Router',
  },
] as const;

export const QUESTION_SEEDS = [
  ...gettingStarted,
  ...reactNativeFundamentals,
  ...layoutAndStyling,
  ...componentsAndState,
  ...navigationBasics,
] as unknown as SeedQuestion[];

const PRIVATE_KEYS = new Set([
  'correctOptionId',
  'correctOptionIds',
  'correctAnswer',
  'correctPairs',
  'correctOrder',
  'correctPlacements',
  'acceptedTextAnswers',
  'expectedRenderTree',
  'errors',
  'grounding',
  'review',
]);

export function publicQuestion(question: SeedQuestion): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(question)) as Record<string, unknown>;

  for (const key of PRIVATE_KEYS) delete clone[key];

  if (Array.isArray(clone.blanks)) {
    clone.blanks = clone.blanks.map((blank) => {
      const publicBlank = { ...(blank as Record<string, unknown>) };
      delete publicBlank.acceptedAnswers;
      return publicBlank;
    });
  }

  return clone;
}

export function optionGroups(question: SeedQuestion) {
  const groups = ['options', 'leftItems', 'rightItems', 'items', 'availableBlocks'] as const;
  return groups.flatMap((group) => {
    const items = question[group];
    if (!Array.isArray(items)) return [];

    return items.map((item, order) => {
      const value = item as Record<string, unknown>;
      const key = String(value.id ?? `${group}-${order + 1}`);
      const content = String(
        value.text ?? value.content ?? value.displayLabel ?? value.componentName ?? value.value ?? key,
      );
      return { group, key, content, metadataJson: JSON.stringify(value), order };
    });
  });
}

export function numericSuffix(value: string): number {
  const match = value.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export type LearningPathLevel = 'beginner' | 'intermediate' | 'advanced';

type LearningPathBase = {
  level: LearningPathLevel;
  title: string;
  goal: string;
  accent: string;
  softColor: string;
};

export type AvailableLearningPath = LearningPathBase & {
  status: 'available';
  courses: string[];
  lessonRange: string;
  questionRange: string;
  progress: number;
};

export type ComingSoonLearningPath = LearningPathBase & {
  status: 'coming_soon';
  topics: string[];
  releaseMessage: string;
};

export type LearningPath = AvailableLearningPath | ComingSoonLearningPath;

export const LEARNING_PATHS: LearningPath[] = [
  {
    level: 'beginner',
    title: 'Beginner',
    goal: 'Build simple Expo apps confidently.',
    status: 'available',
    accent: '#27A844',
    softColor: '#EAF8EE',
    progress: 0.12,
    lessonRange: '35–45',
    questionRange: '180–250',
    courses: [
      'Getting Started',
      'React Native Fundamentals',
      'Layout & Styling',
      'Components & State',
      'Navigation Basics',
    ],
  },
  {
    level: 'intermediate',
    title: 'Intermediate',
    goal: 'Build complete real-world mobile apps.',
    status: 'coming_soon',
    accent: '#D89200',
    softColor: '#FFF6DF',
    topics: ['APIs', 'Forms', 'Device Features', 'State Management', 'Convex Backend'],
    releaseMessage: 'Coming in a future update.',
  },
  {
    level: 'advanced',
    title: 'Advanced',
    goal: 'Ship production-ready Expo applications.',
    status: 'coming_soon',
    accent: '#D84A4A',
    softColor: '#FFF0F0',
    topics: ['Reanimated', 'EAS Build', 'Testing', 'CI/CD', 'App Store Release'],
    releaseMessage: 'Coming in a future update.',
  },
];

export const LEARNING_PATHS_BY_LEVEL = Object.fromEntries(
  LEARNING_PATHS.map((path) => [path.level, path]),
) as Record<LearningPathLevel, LearningPath>;

export function isLearningPathLevel(value: string): value is LearningPathLevel {
  return value in LEARNING_PATHS_BY_LEVEL;
}

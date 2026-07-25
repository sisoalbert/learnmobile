import type { LucideIconName } from '@react-native-vector-icons/lucide';

import type {
  DailyGoalMinutes,
  ExperienceLevel,
  ExpoExperience,
  LearningGoal,
  LearningPlan,
  Motivation,
  OnboardingStepId,
  StartingPoint,
} from '@/state/onboarding-store';

export type OnboardingHeaderMode = 'brand' | 'progress' | 'minimal';
export type OnboardingRequiredAnswer =
  | 'learningGoal'
  | 'experienceLevel'
  | 'expoExperience'
  | 'motivations'
  | 'dailyGoalMinutes'
  | 'reminderPreference'
  | 'learningPlan'
  | 'startingPoint';

export type OnboardingStepConfig = {
  id: OnboardingStepId;
  headerMode: OnboardingHeaderMode;
  title: string;
  body?: string;
  ctaLabel?: string;
  showsLogo?: boolean;
  progress: number;
  requiredAnswer?: OnboardingRequiredAnswer;
};

export type OnboardingOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
  icon: LucideIconName;
  badge?: string;
};

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: 'welcome', headerMode: 'brand', title: 'Welcome to Learn Expo!', body: 'Your personal guide to building real apps with React Native and Expo.', ctaLabel: 'CONTINUE', showsLogo: true, progress: 0 },
  { id: 'introduction', headerMode: 'brand', title: "Hi, I'm Rex!", body: "I'll help you build the skills and confidence to create mobile apps with Expo.", ctaLabel: 'CONTINUE', showsLogo: true, progress: 0.06 },
  { id: 'learning-goal', headerMode: 'progress', title: 'What do you want to learn?', body: "We'll use your goal to shape your learning path.", ctaLabel: 'CONTINUE', progress: 0.12, requiredAnswer: 'learningGoal' },
  { id: 'experience-level', headerMode: 'progress', title: 'How much React Native experience do you have?', ctaLabel: 'CONTINUE', progress: 0.19, requiredAnswer: 'experienceLevel' },
  { id: 'course-preparation', headerMode: 'minimal', title: 'Preparing your learning path…', body: 'Choosing the best lessons for your goals and experience.', showsLogo: true, progress: 0.25 },
  { id: 'expo-experience', headerMode: 'progress', title: 'How familiar are you with Expo?', ctaLabel: 'CONTINUE', progress: 0.31, requiredAnswer: 'expoExperience' },
  { id: 'motivation', headerMode: 'progress', title: 'What motivates you to learn Expo?', body: 'Choose all that apply.', ctaLabel: 'CONTINUE', progress: 0.38, requiredAnswer: 'motivations' },
  { id: 'routine-introduction', headerMode: 'brand', title: 'A little practice goes a long way', body: 'Build a learning routine that fits your day and keep making steady progress.', ctaLabel: 'CONTINUE', showsLogo: true, progress: 0.44 },
  { id: 'daily-goal', headerMode: 'progress', title: 'Choose your daily learning goal', body: 'You can change this at any time.', ctaLabel: "I'M COMMITTED", progress: 0.5, requiredAnswer: 'dailyGoalMinutes' },
  { id: 'weekly-progress', headerMode: 'brand', title: 'Your weekly goal is within reach!', ctaLabel: 'CONTINUE', showsLogo: true, progress: 0.56 },
  { id: 'practice-reminders', headerMode: 'progress', title: 'Stay on track with practice reminders', body: 'Would you like friendly reminders to keep your learning streak going?', ctaLabel: 'CONTINUE', progress: 0.62, requiredAnswer: 'reminderPreference' },
  { id: 'three-month-outcome', headerMode: 'progress', title: 'In three months, you can…', body: 'Complete your path and turn what you learn into working apps.', ctaLabel: 'CONTINUE', progress: 0.69 },
  { id: 'learning-plan', headerMode: 'progress', title: 'How would you like to learn?', ctaLabel: 'CONTINUE', progress: 0.75, requiredAnswer: 'learningPlan' },
  { id: 'starting-point', headerMode: 'progress', title: 'Where would you like to start?', ctaLabel: 'CONTINUE', progress: 0.81, requiredAnswer: 'startingPoint' },
  { id: 'path-confirmation', headerMode: 'brand', title: 'Your personalized path is ready!', body: "We've created a plan around your goals, experience, and daily commitment.", ctaLabel: 'VIEW MY PATH', showsLogo: true, progress: 0.88 },
  { id: 'course-preview', headerMode: 'brand', title: 'Your first course', body: 'Start with the foundations and build your first Expo app step by step.', ctaLabel: 'START COURSE', progress: 0.94 },
  { id: 'lesson-transition', headerMode: 'brand', title: "You're ready for your first lesson!", body: "Let's start building with Expo.", ctaLabel: 'START LESSON 1', showsLogo: true, progress: 1 },
];

export const LEARNING_GOALS: OnboardingOption<LearningGoal>[] = [
  { value: 'react-native-fundamentals', label: 'React Native fundamentals', icon: 'atom' },
  { value: 'expo-fundamentals', label: 'Expo fundamentals', icon: 'triangle' },
  { value: 'complete-apps', label: 'Build complete mobile apps', icon: 'smartphone' },
  { value: 'improve-skills', label: 'Improve my existing skills', icon: 'trending-up' },
  { value: 'react-native-job', label: 'Prepare for a React Native job', icon: 'briefcase-business' },
];

export const EXPERIENCE_LEVELS: OnboardingOption<ExperienceLevel>[] = [
  { value: 'completely-new', label: "I'm completely new", icon: 'sparkles' },
  {
    value: 'javascript-typescript',
    label: 'I know some JavaScript or TypeScript',
    icon: 'braces',
  },
  {
    value: 'small-react-native-app',
    label: "I've built a small React Native app",
    icon: 'smartphone',
  },
  {
    value: 'regular-react-native-builder',
    label: 'I regularly build React Native apps',
    icon: 'blocks',
  },
  {
    value: 'experienced-mobile-developer',
    label: "I'm an experienced mobile developer",
    icon: 'award',
  },
];

export const EXPO_EXPERIENCE_LEVELS: OnboardingOption<ExpoExperience>[] = [
  { value: 'never-used', label: "I've never used Expo", icon: 'circle' },
  { value: 'tried-expo-go', label: "I've tried Expo Go", icon: 'play' },
  { value: 'built-expo-project', label: "I've built an Expo project", icon: 'folder-code' },
  { value: 'used-eas', label: "I've used EAS Build or EAS Submit", icon: 'package-check' },
  { value: 'professional', label: 'I use Expo professionally', icon: 'badge-check' },
];

export const MOTIVATIONS: OnboardingOption<Motivation>[] = [
  { value: 'own-app', label: 'Build my own app', icon: 'lightbulb' },
  { value: 'career', label: 'Improve my career', icon: 'briefcase-business' },
  { value: 'mobile-development', label: 'Learn mobile development', icon: 'smartphone' },
  { value: 'startup-product', label: 'Build a startup product', icon: 'rocket' },
  { value: 'react-native-skills', label: 'Improve my React Native skills', icon: 'trending-up' },
  { value: 'interview', label: 'Prepare for an interview', icon: 'messages-square' },
  { value: 'fun', label: 'Just for fun', icon: 'party-popper' },
  { value: 'other', label: 'Other', icon: 'ellipsis' },
];

export const DAILY_GOALS: OnboardingOption<DailyGoalMinutes>[] = [
  { value: 5, label: '5 min/day', description: 'Casual', icon: 'coffee' },
  { value: 10, label: '10 min/day', description: 'Regular', icon: 'sun' },
  { value: 15, label: '15 min/day', description: 'Serious', icon: 'flame' },
  { value: 20, label: '20 min/day', description: 'Intense', icon: 'zap' },
];

export const LEARNING_PLANS: OnboardingOption<LearningPlan>[] = [
  {
    value: 'guided',
    label: 'Guided path',
    description: 'Follow lessons in a structured order.',
    icon: 'route',
    badge: 'RECOMMENDED',
  },
  {
    value: 'self-directed',
    label: 'Choose my own topics',
    description: 'Explore Expo features independently.',
    icon: 'layout-grid',
  },
];

export const STARTING_POINTS: OnboardingOption<StartingPoint>[] = [
  {
    value: 'scratch',
    label: 'Start from scratch',
    description: 'Begin with React Native and Expo basics.',
    icon: 'flag',
  },
  {
    value: 'assessment',
    label: 'Find my level',
    description: 'Take a quick assessment and receive a personalized starting point.',
    icon: 'search',
    badge: 'RECOMMENDED',
  },
];

export const OUTCOMES = [
  {
    title: 'Build with confidence',
    description: 'Understand React Native and Expo fundamentals.',
    icon: 'rocket' as const,
  },
  {
    title: 'Create complete apps',
    description: 'Build screens, navigation, forms and interactions.',
    icon: 'smartphone' as const,
  },
  {
    title: 'Use native features',
    description: 'Work with the camera, audio, notifications and device APIs.',
    icon: 'shield-check' as const,
  },
  {
    title: 'Ship your app',
    description: 'Create production builds with EAS.',
    icon: 'package-check' as const,
  },
];

export const COURSE_CONTENT = [
  'How Expo works',
  'Create your first Expo project',
  'Understand the project structure',
  'Build your first screen',
  'Run the app on a device',
];

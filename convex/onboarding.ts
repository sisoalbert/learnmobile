import { type Infer, v } from 'convex/values';

const learningGoals = [
  'react-native-fundamentals',
  'expo-fundamentals',
  'complete-apps',
  'improve-skills',
  'react-native-job',
] as const;
const experienceLevels = [
  'completely-new',
  'javascript-typescript',
  'small-react-native-app',
  'regular-react-native-builder',
  'experienced-mobile-developer',
] as const;
const expoExperiences = [
  'never-used',
  'tried-expo-go',
  'built-expo-project',
  'used-eas',
  'professional',
] as const;
const motivations = [
  'own-app',
  'career',
  'mobile-development',
  'startup-product',
  'react-native-skills',
  'interview',
  'fun',
  'other',
] as const;
const dailyGoals = [5, 10, 15, 20] as const;
const reminderPreferences = ['enabled', 'disabled'] as const;
const learningPlans = ['guided', 'self-directed'] as const;
const startingPoints = ['scratch', 'assessment'] as const;
const streakGoals = [3, 5, 7] as const;

export const userOnboardingValidator = v.object({
  completed: v.boolean(),
  learningGoal: v.optional(v.union(
    v.literal('react-native-fundamentals'),
    v.literal('expo-fundamentals'),
    v.literal('complete-apps'),
    v.literal('improve-skills'),
    v.literal('react-native-job'),
  )),
  experienceLevel: v.optional(v.union(
    v.literal('completely-new'),
    v.literal('javascript-typescript'),
    v.literal('small-react-native-app'),
    v.literal('regular-react-native-builder'),
    v.literal('experienced-mobile-developer'),
  )),
  expoExperience: v.optional(v.union(
    v.literal('never-used'),
    v.literal('tried-expo-go'),
    v.literal('built-expo-project'),
    v.literal('used-eas'),
    v.literal('professional'),
  )),
  motivations: v.array(v.union(
    v.literal('own-app'),
    v.literal('career'),
    v.literal('mobile-development'),
    v.literal('startup-product'),
    v.literal('react-native-skills'),
    v.literal('interview'),
    v.literal('fun'),
    v.literal('other'),
  )),
  dailyGoalMinutes: v.optional(v.union(
    v.literal(5),
    v.literal(10),
    v.literal(15),
    v.literal(20),
  )),
  reminderPreference: v.optional(v.union(v.literal('enabled'), v.literal('disabled'))),
  learningPlan: v.optional(v.union(v.literal('guided'), v.literal('self-directed'))),
  startingPoint: v.optional(v.union(v.literal('scratch'), v.literal('assessment'))),
  streakGoal: v.optional(v.union(v.literal(3), v.literal(5), v.literal(7))),
  savedAt: v.number(),
});

export type UserOnboarding = Infer<typeof userOnboardingValidator>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalChoice = <T extends string | number>(
  value: unknown,
  choices: readonly T[],
  field: string,
): T | undefined => {
  if (value === undefined) return undefined;
  if (choices.includes(value as T)) return value as T;
  throw new Error(`Invalid onboarding field: ${field}`);
};

export const buildUserOnboarding = (
  value: unknown,
  savedAt = Date.now(),
): UserOnboarding | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.completed !== 'boolean') {
    throw new Error('Invalid onboarding answers');
  }
  if (!Array.isArray(value.motivations)) {
    throw new Error('Invalid onboarding field: motivations');
  }

  const selectedMotivations = value.motivations.map((motivation) => {
    const selected = optionalChoice(motivation, motivations, 'motivations');
    if (selected === undefined) throw new Error('Invalid onboarding field: motivations');
    return selected;
  });
  const learningGoal = optionalChoice(value.learningGoal, learningGoals, 'learningGoal');
  const experienceLevel = optionalChoice(value.experienceLevel, experienceLevels, 'experienceLevel');
  const expoExperience = optionalChoice(value.expoExperience, expoExperiences, 'expoExperience');
  const dailyGoalMinutes = optionalChoice(value.dailyGoalMinutes, dailyGoals, 'dailyGoalMinutes');
  const reminderPreference = optionalChoice(value.reminderPreference, reminderPreferences, 'reminderPreference');
  const learningPlan = optionalChoice(value.learningPlan, learningPlans, 'learningPlan');
  const startingPoint = optionalChoice(value.startingPoint, startingPoints, 'startingPoint');
  const streakGoal = optionalChoice(value.streakGoal, streakGoals, 'streakGoal');

  return {
    completed: value.completed,
    motivations: selectedMotivations,
    savedAt,
    ...(learningGoal !== undefined ? { learningGoal } : {}),
    ...(experienceLevel !== undefined ? { experienceLevel } : {}),
    ...(expoExperience !== undefined ? { expoExperience } : {}),
    ...(dailyGoalMinutes !== undefined ? { dailyGoalMinutes } : {}),
    ...(reminderPreference !== undefined ? { reminderPreference } : {}),
    ...(learningPlan !== undefined ? { learningPlan } : {}),
    ...(startingPoint !== undefined ? { startingPoint } : {}),
    ...(streakGoal !== undefined ? { streakGoal } : {}),
  };
};

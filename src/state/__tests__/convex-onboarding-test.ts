import { buildUserOnboarding } from '../../../convex/onboarding';

describe('Convex onboarding profile validation', () => {
  test('accepts and timestamps the complete onboarding snapshot', () => {
    expect(buildUserOnboarding({
      completed: true,
      learningGoal: 'expo-fundamentals',
      experienceLevel: 'javascript-typescript',
      expoExperience: 'tried-expo-go',
      motivations: ['own-app', 'career'],
      dailyGoalMinutes: 10,
      reminderPreference: 'enabled',
      learningPlan: 'guided',
      startingPoint: 'scratch',
      streakGoal: 5,
    }, 123_456)).toEqual({
      completed: true,
      learningGoal: 'expo-fundamentals',
      experienceLevel: 'javascript-typescript',
      expoExperience: 'tried-expo-go',
      motivations: ['own-app', 'career'],
      dailyGoalMinutes: 10,
      reminderPreference: 'enabled',
      learningPlan: 'guided',
      startingPoint: 'scratch',
      streakGoal: 5,
      savedAt: 123_456,
    });
  });

  test('rejects values outside the allowed onboarding choices', () => {
    expect(() => buildUserOnboarding({
      completed: true,
      motivations: ['invalid-choice'],
    })).toThrow('Invalid onboarding field: motivations');
  });

  test('allows account creation without a snapshot for non-onboarding signups', () => {
    expect(buildUserOnboarding(undefined)).toBeUndefined();
  });
});

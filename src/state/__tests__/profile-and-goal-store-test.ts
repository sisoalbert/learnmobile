import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLearningGoalStore } from '@/state/learning-goal-store';
import { getProfileFullName, useUserProfileStore } from '@/state/user-profile-store';

describe('local profile and learning goal stores', () => {
  beforeEach(() => {
    useLearningGoalStore.getState().resetGoal();
    useUserProfileStore.getState().resetProfile();
  });

  test('stores and commits a streak goal', () => {
    useLearningGoalStore.getState().selectStreakGoal(7);
    useLearningGoalStore.getState().commitGoal();

    expect(useLearningGoalStore.getState()).toMatchObject({
      selectedStreakGoal: 7,
      isCommitted: true,
    });
  });

  test('stores a password-free user profile and normalizes it on account creation', () => {
    const profile = useUserProfileStore.getState();
    profile.setAge('34');
    profile.setFirstName('  Sam ');
    profile.setLastName(' Lee  ');
    profile.setEmail(' Sam.Lee@Example.COM ');
    profile.markAccountCreated();

    expect(useUserProfileStore.getState()).toMatchObject({
      age: 34,
      firstName: 'Sam',
      lastName: 'Lee',
      email: 'sam.lee@example.com',
      isAccountCreated: true,
    });
    expect(getProfileFullName(useUserProfileStore.getState())).toBe('Sam Lee');
    expect(useUserProfileStore.getState()).not.toHaveProperty('password');
  });

  test('persists only password-free profile fields', async () => {
    const profile = useUserProfileStore.getState();
    profile.setAge(28);
    profile.setFirstName('Ari');
    profile.setLastName('Mokoena');
    profile.setEmail('ari@example.com');

    const persisted = await AsyncStorage.getItem('learn-expo:user-profile');

    expect(persisted).toContain('ari@example.com');
    expect(persisted).not.toContain('password');
  });
});

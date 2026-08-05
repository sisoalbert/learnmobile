import { useLearnerRewardsStore } from '../learner-rewards-store';

describe('learner rewards store', () => {
  beforeEach(() => useLearnerRewardsStore.getState().resetRewards());

  test('stores an authoritative whole-number gem balance', () => {
    useLearnerRewardsStore.getState().setGemBalance(24.9);
    expect(useLearnerRewardsStore.getState().gems).toBe(24);
  });

  test('does not allow a negative balance', () => {
    useLearnerRewardsStore.getState().setGemBalance(-12);
    expect(useLearnerRewardsStore.getState().gems).toBe(0);
  });

  test('resets the runtime cache', () => {
    useLearnerRewardsStore.getState().setGemBalance(42);
    useLearnerRewardsStore.getState().resetRewards();
    expect(useLearnerRewardsStore.getState().gems).toBe(0);
  });
});

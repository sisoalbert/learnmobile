import { create } from 'zustand';

type LearnerRewardsState = {
  gems: number;
  setGemBalance: (gems: number) => void;
  resetRewards: () => void;
};

export const useLearnerRewardsStore = create<LearnerRewardsState>((set) => ({
  gems: 0,
  setGemBalance: (gems) => set({ gems: Math.max(0, Math.floor(gems)) }),
  resetRewards: () => set({ gems: 0 }),
}));

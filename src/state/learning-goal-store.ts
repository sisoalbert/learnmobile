import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type StreakGoal = 3 | 5 | 7;

export type LearningGoalState = {
  hasHydrated: boolean;
  selectedStreakGoal: StreakGoal | null;
  isCommitted: boolean;
  selectStreakGoal: (goal: StreakGoal) => void;
  commitGoal: () => void;
  hydrateCommittedGoal: (goal: StreakGoal) => void;
  resetGoal: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useLearningGoalStore = create<LearningGoalState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      selectedStreakGoal: null,
      isCommitted: false,
      selectStreakGoal: (selectedStreakGoal) => set({ selectedStreakGoal, isCommitted: false }),
      commitGoal: () => {
        if (get().selectedStreakGoal !== null) set({ isCommitted: true });
      },
      hydrateCommittedGoal: (selectedStreakGoal) => set({ selectedStreakGoal, isCommitted: true }),
      resetGoal: () => set({ selectedStreakGoal: null, isCommitted: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'learn-expo:learning-goal',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedStreakGoal: state.selectedStreakGoal,
        isCommitted: state.isCommitted,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FeedbackPreferences } from './feedback.types';

type FeedbackPreferencesState = FeedbackPreferences & {
  hasHydrated: boolean;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  setHapticFeedbackEnabled: (enabled: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
};

export const useFeedbackPreferencesStore = create<FeedbackPreferencesState>()(
  persist(
    (set) => ({
      soundEffectsEnabled: true,
      hapticFeedbackEnabled: true,
      hasHydrated: false,
      setSoundEffectsEnabled: (soundEffectsEnabled) => set({ soundEffectsEnabled }),
      setHapticFeedbackEnabled: (hapticFeedbackEnabled) => set({ hapticFeedbackEnabled }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'learn-expo:feedback-preferences',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ soundEffectsEnabled, hapticFeedbackEnabled }) => ({
        soundEffectsEnabled,
        hapticFeedbackEnabled,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { learnerTokenStorage } from '@/auth/learner-token-storage';

export type LearnerCredential = {
  learnerId: string;
  credential: string;
};

type LearnerSessionState = {
  hasHydrated: boolean;
  session: LearnerCredential | null;
  setSession: (session: LearnerCredential) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useLearnerSessionStore = create<LearnerSessionState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'learn-expo:learner-credential',
      version: 1,
      storage: createJSONStorage(() => learnerTokenStorage),
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

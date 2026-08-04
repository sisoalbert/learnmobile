import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UserProfile = {
  age: number | null;
  firstName: string;
  lastName: string;
  email: string;
};

export type UserProfileState = UserProfile & {
  hasHydrated: boolean;
  isAccountCreated: boolean;
  setAge: (value: string | number | null) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setEmail: (value: string) => void;
  hydrateProfile: (profile: Partial<UserProfile>) => void;
  markAccountCreated: () => void;
  resetProfile: () => void;
  setHasHydrated: (value: boolean) => void;
};

const initialProfile: UserProfile = {
  age: null,
  firstName: '',
  lastName: '',
  email: '',
};

export const getProfileFullName = (profile: Pick<UserProfile, 'firstName' | 'lastName'>) =>
  `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim();

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      ...initialProfile,
      hasHydrated: false,
      isAccountCreated: false,
      setAge: (value) => {
        const parsed = typeof value === 'number' ? value : Number(value);
        set({
          age: value === null || value === '' || !Number.isInteger(parsed) ? null : parsed,
          isAccountCreated: false,
        });
      },
      setFirstName: (firstName) => set({ firstName, isAccountCreated: false }),
      setLastName: (lastName) => set({ lastName, isAccountCreated: false }),
      setEmail: (email) => set({ email, isAccountCreated: false }),
      hydrateProfile: (profile) => set(profile),
      markAccountCreated: () =>
        set((state) => ({
          age: state.age,
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          email: state.email.trim().toLowerCase(),
          isAccountCreated: true,
        })),
      resetProfile: () => set({ ...initialProfile, isAccountCreated: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'learn-expo:user-profile',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        age: state.age,
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        isAccountCreated: state.isAccountCreated,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

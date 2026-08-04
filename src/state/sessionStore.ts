import { create } from 'zustand';

export type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  age?: number;
  firstName?: string;
  lastName?: string;
};

type SessionState = {
  isAuthenticated: boolean;
  user: SessionUser | null;
  continueAsGuest: () => void;
  setAuthenticatedUser: (user: SessionUser) => void;
  signOut: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  user: null,
  continueAsGuest: () => set({ isAuthenticated: false, user: null }),
  setAuthenticatedUser: (user) => set({ isAuthenticated: true, user }),
  signOut: () => set({ isAuthenticated: false, user: null }),
}));

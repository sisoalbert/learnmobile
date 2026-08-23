import { createContext, useContext, type ReactNode } from 'react';

export type StartupRouteState =
  | { status: 'anonymous' }
  | { status: 'loading' }
  | { status: 'authenticated'; onboardingCompleted: boolean };

type StartupRouteResolution = {
  authLoading: boolean;
  authenticated: boolean;
  accountLoading: boolean;
  onboardingCompleted: boolean;
};

export function resolveStartupRouteState({
  accountLoading,
  authLoading,
  authenticated,
  onboardingCompleted,
}: StartupRouteResolution): StartupRouteState {
  if (authLoading || (authenticated && accountLoading)) return { status: 'loading' };
  if (!authenticated) return { status: 'anonymous' };
  return { status: 'authenticated', onboardingCompleted };
}

const StartupRouteContext = createContext<StartupRouteState>({ status: 'anonymous' });

export function StartupRouteProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: StartupRouteState;
}) {
  return <StartupRouteContext.Provider value={value}>{children}</StartupRouteContext.Provider>;
}

export function useStartupRouteState() {
  return useContext(StartupRouteContext);
}

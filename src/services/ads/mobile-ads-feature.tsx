import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { initializeAdMob } from './admob';

export type MobileAdsEnabled = boolean | undefined;

const MobileAdsFeatureContext = createContext<MobileAdsEnabled>(false);

export function MobileAdsFeatureProvider({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: MobileAdsEnabled;
}) {
  useEffect(() => {
    if (enabled) void initializeAdMob().catch(() => undefined);
  }, [enabled]);

  return (
    <MobileAdsFeatureContext.Provider value={enabled}>
      {children}
    </MobileAdsFeatureContext.Provider>
  );
}

export function useMobileAdsEnabled() {
  return useContext(MobileAdsFeatureContext);
}

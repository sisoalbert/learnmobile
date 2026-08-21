import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { initializeAdMob } from './admob';

export type MobileAdsEnabled = boolean | undefined;
export type MobileAdsFlags = {
  inLesson: MobileAdsEnabled;
  endOfLesson: MobileAdsEnabled;
};

const DISABLED_MOBILE_ADS_FLAGS: MobileAdsFlags = {
  inLesson: false,
  endOfLesson: false,
};

const MobileAdsFeatureContext = createContext<MobileAdsFlags>(DISABLED_MOBILE_ADS_FLAGS);

export function MobileAdsFeatureProvider({
  children,
  flags,
}: {
  children: ReactNode;
  flags?: MobileAdsFlags;
}) {
  const resolvedFlags = flags ?? { inLesson: undefined, endOfLesson: undefined };

  useEffect(() => {
    if (resolvedFlags.inLesson || resolvedFlags.endOfLesson) {
      void initializeAdMob().catch(() => undefined);
    }
  }, [resolvedFlags.endOfLesson, resolvedFlags.inLesson]);

  return (
    <MobileAdsFeatureContext.Provider value={resolvedFlags}>
      {children}
    </MobileAdsFeatureContext.Provider>
  );
}

export function useInLessonAdsEnabled() {
  return useContext(MobileAdsFeatureContext).inLesson;
}

export function useEndOfLessonAdsEnabled() {
  return useContext(MobileAdsFeatureContext).endOfLesson;
}

import * as Sentry from '@sentry/react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { AppState, Platform } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useSessionStore } from '@/state/sessionStore';

export const LEARN_EXPO_PRO_ENTITLEMENT_ID = 'Learn Expo Pro';

export type RevenueCatStatus = 'idle' | 'loading' | 'ready' | 'error';

type RevenueCatContextValue = {
  customerInfo: CustomerInfo | undefined;
  errorMessage: string | null;
  hasPro: boolean;
  presentCustomerCenter: () => Promise<boolean>;
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  status: RevenueCatStatus;
};

const defaultRevenueCatContext: RevenueCatContextValue = {
  customerInfo: undefined,
  errorMessage: null,
  hasPro: false,
  presentCustomerCenter: async () => false,
  presentPaywall: async () => null,
  refreshCustomerInfo: async () => null,
  restorePurchases: async () => null,
  status: 'idle',
};

const RevenueCatContext = createContext<RevenueCatContextValue>(defaultRevenueCatContext);

let configuredAppUserId: string | null = null;

export const isNativeRevenueCatPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

export function hasActiveProEntitlement(customerInfo: CustomerInfo | undefined) {
  return customerInfo?.entitlements.active[LEARN_EXPO_PRO_ENTITLEMENT_ID] !== undefined;
}

function reportRevenueCatError(operation: string, error: unknown) {
  Sentry.captureException(error, {
    tags: {
      area: 'revenuecat',
      operation,
    },
  });
}

function userFacingError(operation: 'configure' | 'customer-info' | 'paywall' | 'restore' | 'customer-center') {
  switch (operation) {
    case 'configure':
      return 'Subscriptions are not configured for this build.';
    case 'customer-info':
      return 'Unable to refresh your subscription status. Please try again.';
    case 'paywall':
      return 'Unable to open subscriptions right now. Please try again.';
    case 'restore':
      return 'Unable to restore purchases right now. Please try again.';
    case 'customer-center':
      return 'Unable to open subscription management right now. Please try again.';
  }
}

export function RevenueCatProvider({
  appUserId,
  children,
  serverHasPro = false,
}: {
  appUserId: string | undefined;
  children: ReactNode;
  serverHasPro?: boolean;
}) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<RevenueCatStatus>('idle');
  const isMounted = useRef(true);
  const configuredForUser = useRef<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    if (!isNativeRevenueCatPlatform || configuredForUser.current === null) return null;

    try {
      const nextCustomerInfo = await Purchases.getCustomerInfo();
      if (isMounted.current) {
        setCustomerInfo(nextCustomerInfo);
        setErrorMessage(null);
        setStatus('ready');
      }
      return nextCustomerInfo;
    } catch (error) {
      reportRevenueCatError('get_customer_info', error);
      if (isMounted.current) {
        setErrorMessage(userFacingError('customer-info'));
        setStatus('error');
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isNativeRevenueCatPlatform) return;

    if (!appUserId) {
      configuredForUser.current = null;
      const resetTimer = setTimeout(() => {
        setCustomerInfo(undefined);
        setErrorMessage(null);
        setStatus('idle');
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
    if (!apiKey) {
      const errorTimer = setTimeout(() => {
        setErrorMessage(userFacingError('configure'));
        setStatus('error');
      }, 0);
      return () => clearTimeout(errorTimer);
    }

    let active = true;
    const customerInfoListener = (nextCustomerInfo: CustomerInfo) => {
      if (!active) return;
      setCustomerInfo(nextCustomerInfo);
      setErrorMessage(null);
      setStatus('ready');
    };

    const configure = async () => {
      setStatus('loading');
      try {
        const sdkAlreadyConfigured = await Purchases.isConfigured();
        if (!sdkAlreadyConfigured) {
          Purchases.configure({ apiKey, appUserID: appUserId });
        } else if (configuredAppUserId !== appUserId) {
          await Purchases.logIn(appUserId);
        }

        configuredAppUserId = appUserId;
        configuredForUser.current = appUserId;
        Purchases.addCustomerInfoUpdateListener(customerInfoListener);
        await refreshCustomerInfo();
      } catch (error) {
        reportRevenueCatError('configure', error);
        if (active) {
          setErrorMessage(userFacingError('configure'));
          setStatus('error');
        }
      }
    };

    void configure();

    return () => {
      active = false;
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [appUserId, refreshCustomerInfo]);

  useEffect(() => {
    if (!isNativeRevenueCatPlatform) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshCustomerInfo();
    });
    return () => subscription.remove();
  }, [refreshCustomerInfo]);

  const presentPaywall = useCallback(async () => {
    if (!isNativeRevenueCatPlatform || configuredForUser.current === null) return null;

    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: LEARN_EXPO_PRO_ENTITLEMENT_ID,
      });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await refreshCustomerInfo();
      }
      return result;
    } catch (error) {
      reportRevenueCatError('present_paywall', error);
      if (isMounted.current) setErrorMessage(userFacingError('paywall'));
      return null;
    }
  }, [refreshCustomerInfo]);

  const restorePurchases = useCallback(async () => {
    if (!isNativeRevenueCatPlatform || configuredForUser.current === null) return null;

    try {
      const restoredCustomerInfo = await Purchases.restorePurchases();
      if (isMounted.current) {
        setCustomerInfo(restoredCustomerInfo);
        setErrorMessage(null);
        setStatus('ready');
      }
      return restoredCustomerInfo;
    } catch (error) {
      reportRevenueCatError('restore_purchases', error);
      if (isMounted.current) setErrorMessage(userFacingError('restore'));
      return null;
    }
  }, []);

  const presentCustomerCenter = useCallback(async () => {
    if (!isNativeRevenueCatPlatform || configuredForUser.current === null) return false;

    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: ({ customerInfo: restoredCustomerInfo }) => {
            setCustomerInfo(restoredCustomerInfo);
            setErrorMessage(null);
            setStatus('ready');
          },
          onRestoreFailed: ({ error }) => {
            reportRevenueCatError('customer_center_restore', error);
          },
        },
      });
      await refreshCustomerInfo();
      return true;
    } catch (error) {
      reportRevenueCatError('present_customer_center', error);
      if (isMounted.current) setErrorMessage(userFacingError('customer-center'));
      return false;
    }
  }, [refreshCustomerInfo]);

  const value = useMemo<RevenueCatContextValue>(() => ({
    customerInfo,
    errorMessage,
    hasPro: (customerInfo ? hasActiveProEntitlement(customerInfo) : false) || serverHasPro,
    presentCustomerCenter,
    presentPaywall,
    refreshCustomerInfo,
    restorePurchases,
    status: isNativeRevenueCatPlatform ? status : 'ready',
  }), [customerInfo, errorMessage, presentCustomerCenter, presentPaywall, refreshCustomerInfo, restorePurchases, serverHasPro, status]);

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}

/**
 * One access signal for premium UI. CustomerInfo wins immediately after a
 * native purchase, while the Convex-backed session plan remains a safe fallback
 * during startup and outside the provider (for example, isolated screen tests).
 */
export function useProAccess() {
  const { hasPro } = useRevenueCat();
  const plan = useSessionStore((state) => state.user?.plan);
  return hasPro || plan === 'premium';
}

import * as Sentry from '@sentry/react-native';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { api } from '../../../convex/_generated/api';

const INSTALLATION_ID_KEY = 'learn-expo.installation-id';
const MAX_TOKEN_ATTEMPTS = 5;
const ALLOWED_NOTIFICATION_ROUTES = new Set(['/home']);

type ReminderPreference = 'enabled' | 'disabled' | undefined;
type RegisterDevice = (args: {
  installationId: string;
  expoPushToken: string;
  platform: 'ios' | 'android';
}) => Promise<unknown>;
type DisableDevice = (args: { installationId: string }) => Promise<unknown>;
type SynchronizationSource = 'home_mount' | 'app_active' | 'native_token_changed' | 'settings_toggle';

let activeSynchronization: Promise<void> | null = null;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function permissionGranted(permission: Notifications.NotificationPermissionsStatus) {
  if (permission.granted) return true;
  const iosStatus = permission.ios?.status;
  return iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED
    || iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
    || iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

function logHomePush(message: string, details?: unknown) {
  if (!__DEV__) return;
  console.log(`[Home push] ${message}`, details ?? '');
}

function permissionDetails(permission: Notifications.NotificationPermissionsStatus) {
  return {
    status: permission.status,
    granted: permissionGranted(permission),
    canAskAgain: permission.canAskAgain,
    iosStatus: permission.ios?.status,
  };
}

async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('learning', {
      name: 'Learning progress',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  logHomePush('permission status', permissionDetails(existing));
  if (permissionGranted(existing) || !existing.canAskAgain) return existing;

  const requested = await Notifications.requestPermissionsAsync();
  logHomePush('permission status after request', permissionDetails(requested));
  return requested;
}

async function getExpoPushTokenWithRetry() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID is unavailable');

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt += 1) {
    try {
      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_TOKEN_ATTEMPTS - 1) await wait(1000 * (2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function getInstallationId() {
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing) return existing;

  const installationId = globalThis.crypto?.randomUUID?.()
    ?? `install-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

async function registerCurrentDevice(
  registerDevice: RegisterDevice,
  disableDevice: DisableDevice,
  source: SynchronizationSource,
) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    logHomePush('push registration unsupported on this platform', { platform: Platform.OS, source });
    return;
  }
  if (!Device.isDevice) {
    logHomePush('push registration requires a physical device', { platform: Platform.OS, source });
    return;
  }

  const permission = await requestNotificationPermission();
  if (!permissionGranted(permission)) {
    logHomePush('permission denied', { ...permissionDetails(permission), source });
    await disableStoredDeviceNow(disableDevice);
    return;
  }

  const [installationId, expoPushToken] = await Promise.all([
    getInstallationId(),
    getExpoPushTokenWithRetry(),
  ]);
  logHomePush('Expo push token acquired', { expoPushToken, source });
  await registerDevice({ installationId, expoPushToken, platform: Platform.OS });
  logHomePush('Expo push token saved to Convex', { expoPushToken, installationId, source });
}

async function disableStoredDeviceNow(disableDevice: DisableDevice) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const installationId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (!installationId) return;
  await disableDevice({ installationId });
}

export async function disableStoredDevice(disableDevice: DisableDevice) {
  await activeSynchronization?.catch(() => undefined);
  await disableStoredDeviceNow(disableDevice);
}

export async function synchronizeStoredDevice(
  registerDevice: RegisterDevice,
  disableDevice: DisableDevice,
) {
  await synchronizeCurrentDevice(registerDevice, disableDevice, 'settings_toggle');
}

function synchronizeCurrentDevice(
  registerDevice: RegisterDevice,
  disableDevice: DisableDevice,
  source: SynchronizationSource,
) {
  if (activeSynchronization) return activeSynchronization;

  activeSynchronization = registerCurrentDevice(registerDevice, disableDevice, source)
    .catch((error) => {
      logHomePush('registration failed', {
        message: error instanceof Error ? error.message : String(error),
        source,
      });
      Sentry.captureException(error, {
        tags: { area: 'notifications', operation: 'synchronize_device', source },
      });
    })
    .finally(() => {
      activeSynchronization = null;
    });
  return activeSynchronization;
}

export function useHomePushNotificationRegistration(
  authenticated: boolean,
  reminderPreference: ReminderPreference,
) {
  const registerDevice = useMutation(api.notifications.registerDevice);
  const disableDevice = useMutation(api.notifications.disableDevice);
  const lastNativeToken = useRef<string | undefined>(undefined);

  const synchronize = useCallback((source: SynchronizationSource) => {
    if (!authenticated) return;
    if (reminderPreference === 'disabled') {
      logHomePush('notifications disabled by user preference', { source });
      void disableStoredDevice(disableDevice);
      return;
    }
    void synchronizeCurrentDevice(registerDevice, disableDevice, source);
  }, [authenticated, disableDevice, registerDevice, reminderPreference]);

  useEffect(() => {
    if (!authenticated) return;
    synchronize('home_mount');
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') synchronize('app_active');
    });
    const tokenSubscription = Platform.OS === 'ios' || Platform.OS === 'android'
      ? Notifications.addPushTokenListener((token) => {
        const tokenSignature = JSON.stringify(token.data) ?? String(token.data);
        if (lastNativeToken.current === tokenSignature) return;
        lastNativeToken.current = tokenSignature;

        // getExpoPushTokenAsync can surface the current native token through this
        // listener. The in-flight guard prevents that observation from recursively
        // starting another Expo token request, while a later token change resyncs.
        if (!activeSynchronization) synchronize('native_token_changed');
      })
      : null;
    return () => {
      subscription.remove();
      tokenSubscription?.remove();
    };
  }, [authenticated, synchronize]);
}

export function usePushNotificationObserver() {
  const router = useRouter();
  const handledNotificationId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const notification = response.notification;
      if (handledNotificationId.current === notification.request.identifier) return;
      handledNotificationId.current = notification.request.identifier;
      const url = notification.request.content.data?.url;
      if (typeof url === 'string' && ALLOWED_NOTIFICATION_ROUTES.has(url)) {
        router.push(url as never);
      }
    };

    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) {
      handleResponse(initialResponse);
      void Notifications.clearLastNotificationResponseAsync();
    }

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      Sentry.addBreadcrumb({
        category: 'notifications',
        message: 'Push notification received',
        data: { identifier: notification.request.identifier },
        level: 'info',
      });
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);
}

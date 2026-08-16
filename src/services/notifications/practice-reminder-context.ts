import * as Sentry from '@sentry/react-native';
import { useMutation } from 'convex/react';
import { getCalendars } from 'expo-localization';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { api } from '../../../convex/_generated/api';

export function getDeviceTimezone() {
  return getCalendars()[0]?.timeZone
    ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    ?? 'UTC';
}

export function usePracticeReminderContext(
  authenticated: boolean,
  storedTimezone: string | undefined,
) {
  const syncContext = useMutation(api.users.syncPracticeReminderContext);
  const inFlightTimezone = useRef<string | undefined>(undefined);

  const synchronize = useCallback(() => {
    if (!authenticated) return;
    const timezone = getDeviceTimezone();
    if (timezone === storedTimezone || timezone === inFlightTimezone.current) return;
    inFlightTimezone.current = timezone;
    void syncContext({ timezone }).catch((error) => {
      Sentry.captureException(error, {
        tags: { area: 'notifications', operation: 'sync_practice_reminder_context' },
        extra: { timezone },
      });
    }).finally(() => {
      inFlightTimezone.current = undefined;
    });
  }, [authenticated, storedTimezone, syncContext]);

  useEffect(() => {
    synchronize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') synchronize();
    });
    return () => subscription.remove();
  }, [synchronize]);
}

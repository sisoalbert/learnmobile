import * as Sentry from '@sentry/react-native';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../convex/_generated/api';
import { useLearnerSessionStore, type LearnerCredential } from '@/state/learner-session-store';
import { useLessonResultsStore } from '@/state/lesson-results-store';
import { isInvalidLearnerCredential } from './guest-session-errors';

type RecoveryState =
  | { status: 'idle' }
  | { status: 'error' };

type GuestSessionGateProps = {
  authenticated: boolean;
  loading: boolean;
  children: ReactNode;
};

export function GuestSessionGate({ authenticated, loading, children }: GuestSessionGateProps) {
  const hasHydrated = useLearnerSessionStore((state) => state.hasHydrated);
  const learnerSession = useLearnerSessionStore((state) => state.session);
  const setLearnerSession = useLearnerSessionStore((state) => state.setSession);
  const clearLearnerSession = useLearnerSessionStore((state) => state.clearSession);
  const createGuestSession = useAction(api.learning.createGuestSession);
  const mergeGuestProgress = useMutation(api.learning.mergeGuestProgress);
  const validation = useQuery(
    api.learning.validateGuestSession,
    !loading && !authenticated && hasHydrated && learnerSession ? learnerSession : 'skip',
  );
  const [recovery, setRecovery] = useState<RecoveryState>({ status: 'idle' });
  const [retryVersion, setRetryVersion] = useState(0);
  const requestActive = useRef(false);
  const invalidRecoveryUsed = useRef(false);

  const replaceGuestSession = useCallback((invalidSession: LearnerCredential | null) => {
    if (requestActive.current) return;
    requestActive.current = true;

    void createGuestSession({}).then((created) => {
      if (invalidSession) useLessonResultsStore.getState().resetLesson();
      setLearnerSession(created);
    }).catch((error) => {
      Sentry.captureException(error, {
        tags: {
          area: 'learning',
          operation: invalidSession ? 'replace_guest_session' : 'create_guest_session',
        },
        extra: invalidSession ? { learnerId: invalidSession.learnerId } : undefined,
      });
      setRecovery({ status: 'error' });
    }).finally(() => {
      requestActive.current = false;
    });
  }, [createGuestSession, setLearnerSession]);

  useEffect(() => {
    if (loading || authenticated || !hasHydrated || recovery.status !== 'idle') return;

    if (!learnerSession) {
      void replaceGuestSession(null);
      return;
    }

    if (validation?.valid !== false) return;
    if (invalidRecoveryUsed.current) {
      setRecovery({ status: 'error' });
      return;
    }

    invalidRecoveryUsed.current = true;
    void replaceGuestSession(learnerSession);
  }, [authenticated, hasHydrated, learnerSession, loading, recovery.status, replaceGuestSession, retryVersion, validation?.valid]);

  useEffect(() => {
    if (!authenticated || !learnerSession) return;
    let active = true;
    void mergeGuestProgress(learnerSession).then(() => {
      if (active) clearLearnerSession();
    }).catch((error) => {
      if (isInvalidLearnerCredential(error)) {
        if (active) {
          useLessonResultsStore.getState().resetLesson();
          clearLearnerSession();
        }
        return;
      }
      Sentry.captureException(error, {
        tags: { area: 'learning', operation: 'merge_guest_progress' },
        extra: { learnerId: learnerSession.learnerId },
      });
    });
    return () => { active = false; };
  }, [authenticated, clearLearnerSession, learnerSession, mergeGuestProgress]);

  if (!loading && authenticated) return children;
  if (!loading && hasHydrated && learnerSession && validation?.valid && recovery.status === 'idle') {
    return children;
  }

  if (recovery.status === 'error') {
    return (
      <SessionMessage
        actionLabel="Try again"
        message="We couldn’t restore your learning session. Check your connection and try again."
        onAction={() => {
          invalidRecoveryUsed.current = false;
          setRecovery({ status: 'idle' });
          setRetryVersion((value) => value + 1);
        }}
        title="Unable to restore your session"
      />
    );
  }

  return <SessionMessage loading message="Restoring your learning session…" />;
}

function SessionMessage({
  actionLabel,
  loading = false,
  message,
  onAction,
  title,
}: {
  actionLabel?: string;
  loading?: boolean;
  message: string;
  onAction?: () => void;
  title?: string;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.messageCard}>
        {loading ? <ActivityIndicator accessibilityLabel="Restoring learning session" color="#2289FD" size="large" /> : null}
        {title ? <Text accessibilityRole="header" selectable style={styles.title}>{title}</Text> : null}
        <Text accessibilityLiveRegion="polite" selectable style={styles.message}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFD' },
  messageCard: { width: '100%', maxWidth: 440, alignItems: 'center', gap: 14 },
  title: { color: '#17213B', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  message: { color: '#667085', fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'center' },
  button: { minHeight: 50, minWidth: 150, alignItems: 'center', justifyContent: 'center', marginTop: 6, paddingHorizontal: 22, borderRadius: 15, backgroundColor: '#2289FD' },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});

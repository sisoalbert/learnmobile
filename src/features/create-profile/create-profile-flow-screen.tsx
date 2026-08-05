import { useAuthActions } from '@convex-dev/auth/react';
import * as Sentry from '@sentry/react-native';
import { useConvexAuth, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  AgeScreen,
  CreateProfileShell,
  EmailScreen,
  NameScreen,
  PasswordScreen,
  ProfilePromptScreen,
  SuccessScreen,
} from '@/features/create-profile/create-profile-components';
import {
  isValidAge,
  isValidEmail,
  suggestEmail,
} from '@/features/create-profile/create-profile-validation';
import { useLearningGoalStore } from '@/state/learning-goal-store';
import { useOnboardingStore } from '@/state/onboarding-store';
import { useSessionStore } from '@/state/sessionStore';
import { getProfileFullName, useUserProfileStore } from '@/state/user-profile-store';
import { api } from '../../../convex/_generated/api';

type CreateProfileStep = 'prompt' | 'age' | 'name' | 'email' | 'password' | 'success';
type PendingProfile = { age: number; firstName: string; lastName: string; email: string; name: string };

export default function CreateProfileFlowScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated: convexAuthenticated } = useConvexAuth();
  const normalizeCurrentProfile = useMutation(api.users.updateProfile);
  const setAuthenticatedUser = useSessionStore((state) => state.setAuthenticatedUser);
  const [step, setStep] = useState<CreateProfileStep>('prompt');
  const age = useUserProfileStore((state) => state.age);
  const firstName = useUserProfileStore((state) => state.firstName);
  const lastName = useUserProfileStore((state) => state.lastName);
  const email = useUserProfileStore((state) => state.email);
  const setAge = useUserProfileStore((state) => state.setAge);
  const setFirstName = useUserProfileStore((state) => state.setFirstName);
  const setLastName = useUserProfileStore((state) => state.setLastName);
  const setEmail = useUserProfileStore((state) => state.setEmail);
  const markAccountCreated = useUserProfileStore((state) => state.markAccountCreated);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<PendingProfile | null>(null);

  const ageText = age?.toString() ?? '';
  const fullName = getProfileFullName({ firstName, lastName });
  const ageValid = isValidAge(ageText);
  const nameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const emailValid = isValidEmail(email);
  const emailInvalid = email.trim().length > 0 && !emailValid;
  const passwordValid = password.length >= 8;
  const openTerms = () => router.push('/terms' as never);
  const openPrivacy = () => router.push('/privacy' as never);

  useEffect(() => {
    if (!convexAuthenticated || !pendingProfile) return;
    let active = true;

    void normalizeCurrentProfile({
      age: pendingProfile.age,
      firstName: pendingProfile.firstName,
      lastName: pendingProfile.lastName,
    }).then(({ username }) => {
      if (!active) return;
      setAuthenticatedUser({
        id: pendingProfile.email,
        email: pendingProfile.email,
        name: pendingProfile.name,
        age: pendingProfile.age,
        firstName: pendingProfile.firstName,
        lastName: pendingProfile.lastName,
        username,
        plan: 'free',
      });
      setEmail(pendingProfile.email);
      markAccountCreated();
      setPendingProfile(null);
      setStep('success');
    }).catch((error) => {
      if (!active) return;
      Sentry.captureException(error, {
        tags: { area: 'auth', operation: 'normalize_profile' },
      });
      setErrorMessage('Your account is signed in, but the profile could not be updated. Please try again.');
    }).finally(() => {
      if (active) setIsSubmitting(false);
    });

    return () => { active = false; };
  }, [convexAuthenticated, markAccountCreated, normalizeCurrentProfile, pendingProfile, setAuthenticatedUser, setEmail]);

  const handleCreateProfile = async () => {
    if (!ageValid || !nameValid || !emailValid || !passwordValid || isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const onboarding = getLocalOnboardingAnswers();

    setErrorMessage('');
    setIsSubmitting(true);
    let awaitingProfile = false;

    try {
      let result;
      try {
        result = await signIn('password', {
          email: normalizedEmail,
          password,
          flow: 'signUp',
          name: fullName,
          age,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          onboarding,
        });
      } catch (signUpError) {
        const message = signUpError instanceof Error ? signUpError.message.toLowerCase() : '';
        if (!message.includes('already')) throw signUpError;
        try {
          result = await signIn('password', {
            email: normalizedEmail,
            password,
            flow: 'signIn',
          });
        } catch {
          throw signUpError;
        }
      }

      if (!result.signingIn) {
        Sentry.captureMessage('Create profile sign up did not complete', {
          level: 'warning',
          tags: {
            area: 'auth',
            operation: 'create_profile_sign_up',
          },
        });
        setErrorMessage('We could not create your profile. Please try again.');
        return;
      }

      setPendingProfile({
        age: age!,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        name: fullName,
      });
      awaitingProfile = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      Sentry.captureMessage(message, {
        level: 'warning',
        tags: {
          area: 'auth',
          operation: 'create_profile_sign_up',
        },
      });
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      if (!awaitingProfile) setIsSubmitting(false);
    }
  };

  if (step === 'prompt') {
    return (
      <CreateProfileShell
        centered
        onPrimaryPress={() => setStep('age')}
        onSecondaryPress={() => router.replace('/home')}
        primaryLabel="Create profile"
        secondaryLabel="Later"
      >
        <ProfilePromptScreen />
      </CreateProfileShell>
    );
  }

  if (step === 'age') {
    return (
      <CreateProfileShell
        legal={ageValid}
        navigation="close"
        onNavigationPress={() => router.replace('/home')}
        onPrimaryPress={() => setStep('name')}
        onPrivacyPress={openPrivacy}
        onTermsPress={openTerms}
        primaryDisabled={!ageValid}
        primaryLabel="Next"
        progress={0.2}
      >
        <AgeScreen age={ageText} onChangeAge={setAge} valid={ageValid} />
      </CreateProfileShell>
    );
  }

  if (step === 'name') {
    return (
      <CreateProfileShell
        navigation="back"
        onNavigationPress={() => setStep('age')}
        onPrimaryPress={() => setStep('email')}
        primaryDisabled={!nameValid}
        primaryLabel="Next"
        progress={0.45}
      >
        <NameScreen
          firstName={firstName}
          lastName={lastName}
          onChangeFirstName={setFirstName}
          onChangeLastName={setLastName}
        />
      </CreateProfileShell>
    );
  }

  if (step === 'email') {
    const suggestion = suggestEmail(email, firstName, lastName);

    return (
      <CreateProfileShell
        navigation="back"
        onNavigationPress={() => setStep('name')}
        onPrimaryPress={() => setStep('password')}
        primaryDisabled={!emailValid}
        primaryLabel="Next"
        progress={0.7}
      >
        <EmailScreen
          email={email}
          fullName={fullName}
          invalid={emailInvalid}
          onChangeEmail={(value) => {
            setEmail(value);
            setErrorMessage('');
          }}
          onUseSuggestion={() => setEmail(suggestion)}
          suggestion={suggestion}
        />
      </CreateProfileShell>
    );
  }

  if (step === 'password') {
    return (
      <CreateProfileShell
        legal={passwordValid}
        navigation="back"
        onNavigationPress={() => setStep('email')}
        onPrimaryPress={() => void handleCreateProfile()}
        onPrivacyPress={openPrivacy}
        onTermsPress={openTerms}
        primaryDisabled={!passwordValid || isSubmitting}
        primaryLabel={isSubmitting ? 'Creating profile…' : 'Create profile'}
        progress={0.9}
      >
        <PasswordScreen
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          onChangePassword={(value) => {
            setPassword(value);
            setErrorMessage('');
          }}
          onToggleVisibility={() => setPasswordVisible((visible) => !visible)}
          password={password}
          visible={passwordVisible}
        />
      </CreateProfileShell>
    );
  }

  return (
    <CreateProfileShell
      centered
      onPrimaryPress={() => router.replace('/home')}
      primaryLabel="Continue"
    >
      <SuccessScreen fullName={fullName} />
    </CreateProfileShell>
  );
}

export function getLocalOnboardingAnswers() {
  const onboarding = useOnboardingStore.getState();
  const streakGoal = useLearningGoalStore.getState().selectedStreakGoal;

  return {
    completed: onboarding.isCompleted,
    motivations: [...onboarding.motivations],
    ...(onboarding.learningGoal !== null ? { learningGoal: onboarding.learningGoal } : {}),
    ...(onboarding.experienceLevel !== null ? { experienceLevel: onboarding.experienceLevel } : {}),
    ...(onboarding.expoExperience !== null ? { expoExperience: onboarding.expoExperience } : {}),
    ...(onboarding.dailyGoalMinutes !== null ? { dailyGoalMinutes: onboarding.dailyGoalMinutes } : {}),
    ...(onboarding.reminderPreference !== null ? { reminderPreference: onboarding.reminderPreference } : {}),
    ...(onboarding.learningPlan !== null ? { learningPlan: onboarding.learningPlan } : {}),
    ...(onboarding.startingPoint !== null ? { startingPoint: onboarding.startingPoint } : {}),
    ...(streakGoal !== null ? { streakGoal } : {}),
  };
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.toLowerCase().includes('already')) {
    return 'An account with this email already exists. Try signing in.';
  }

  return 'Unable to create your profile. Please try again.';
}

import { useRouter } from 'expo-router';
import { useState } from 'react';

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

type CreateProfileStep = 'prompt' | 'age' | 'name' | 'email' | 'password' | 'success';

export default function CreateProfileFlowScreen() {
  const router = useRouter();
  const [step, setStep] = useState<CreateProfileStep>('prompt');
  const [age, setAge] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const ageValid = isValidAge(age);
  const nameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const emailValid = isValidEmail(email);
  const emailInvalid = email.trim().length > 0 && !emailValid;
  const passwordValid = password.length >= 8;
  const openTerms = () => router.push('/terms' as never);
  const openPrivacy = () => router.push('/privacy' as never);

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
        <AgeScreen age={age} onChangeAge={setAge} valid={ageValid} />
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
          onChangeEmail={setEmail}
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
        onPrimaryPress={() => setStep('success')}
        onPrivacyPress={openPrivacy}
        onTermsPress={openTerms}
        primaryDisabled={!passwordValid}
        primaryLabel="Create profile"
        progress={0.9}
      >
        <PasswordScreen
          onChangePassword={setPassword}
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

import { useAuthActions } from '@convex-dev/auth/react';
import { Lucide } from '@react-native-vector-icons/lucide';
import * as Sentry from '@sentry/react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';
import { goBackOrReplace } from '@/navigation/go-back-or-replace';
import { useSessionStore } from '@/state/sessionStore';

const COLORS = {
  blue: '#1CB0F6',
  blueDark: '#1899D6',
  surface: '#FFFFFF',
  text: '#4B4B4B',
  muted: '#737D91',
  inputBorder: '#E5E5E5',
  inputBackground: '#F7F7F9',
  disabled: '#E5E5E5',
  disabledShadow: '#CECECE',
  successBackground: '#E8F8EF',
  successText: '#237A4B',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const setAuthenticatedUser = useSessionStore((state) => state.setAuthenticatedUser);
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail);
  const isCodeValid = /^\d{8}$/.test(code);
  const isPasswordValid = newPassword.length >= 8;
  const passwordsMatch = newPassword === confirmPassword;
  const canResetPassword =
    isCodeValid && isPasswordValid && passwordsMatch && !isSubmitting;

  const requestResetCode = async () => {
    if (!isEmailValid || isSubmitting) return;

    setErrorMessage('');
    setStatusMessage('');
    setIsSubmitting(true);

    try {
      await signIn('password', {
        email: normalizedEmail,
        flow: 'reset',
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: 'auth', operation: 'request_password_reset' },
      });
    } finally {
      setStep('verify');
      setStatusMessage('If an account exists for that email, we sent an 8-digit reset code.');
      setIsSubmitting(false);
    }
  };

  const resetPassword = async () => {
    if (!canResetPassword) return;

    setErrorMessage('');
    setStatusMessage('');
    setIsSubmitting(true);

    try {
      const result = await signIn('password', {
        email: normalizedEmail,
        code,
        newPassword,
        flow: 'reset-verification',
      });

      if (!result.signingIn) {
        setErrorMessage('We could not complete the reset. Please request a new code.');
        return;
      }

      setAuthenticatedUser({ id: normalizedEmail, email: normalizedEmail });
      router.replace('/home');
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: 'auth', operation: 'reset_password' },
      });
      setErrorMessage('That code is invalid or expired. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => goBackOrReplace('/signin', router);

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={handleBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Image source={require('@/assets/logo.png')} style={styles.logo} contentFit="contain" />

          <View style={styles.form}>
            <View style={styles.heading}>
              <Text selectable style={styles.title}>
                {step === 'request' ? 'Forgot your password?' : 'Check your email'}
              </Text>
              <Text selectable style={styles.description}>
                {step === 'request'
                  ? 'Enter your account email and we’ll send you a reset code.'
                  : `Enter the code sent for ${normalizedEmail} and choose a new password.`}
              </Text>
            </View>

            {step === 'request' ? (
              <>
                <TextInput
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setEmail(value);
                    setErrorMessage('');
                  }}
                  onSubmitEditing={() => void requestResetCode()}
                  placeholder="Email"
                  placeholderTextColor="#9AA2B1"
                  returnKeyType="send"
                  style={styles.input}
                  value={email}
                />

                <PrimaryButton
                  disabled={!isEmailValid || isSubmitting}
                  label={isSubmitting ? 'Sending code…' : 'Send reset code'}
                  onPress={() => void requestResetCode()}
                />
              </>
            ) : (
              <>
                {statusMessage ? (
                  <Text accessibilityRole="alert" selectable style={styles.statusText}>
                    {statusMessage}
                  </Text>
                ) : null}

                <TextInput
                  accessibilityLabel="Reset code"
                  autoComplete="one-time-code"
                  editable={!isSubmitting}
                  keyboardType="number-pad"
                  maxLength={8}
                  onChangeText={(value) => {
                    setCode(value.replace(/\D/g, '').slice(0, 8));
                    setErrorMessage('');
                  }}
                  placeholder="8-digit code"
                  placeholderTextColor="#9AA2B1"
                  style={[styles.input, styles.codeInput]}
                  value={code}
                />

                <PasswordInput
                  accessibilityLabel="New password"
                  editable={!isSubmitting}
                  onChangeText={(value) => {
                    setNewPassword(value);
                    setErrorMessage('');
                  }}
                  onSubmitEditing={() => void resetPassword()}
                  placeholder="New password"
                  showPassword={showNewPassword}
                  togglePassword={() => setShowNewPassword((current) => !current)}
                  value={newPassword}
                />

                <PasswordInput
                  accessibilityLabel="Confirm new password"
                  editable={!isSubmitting}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setErrorMessage('');
                  }}
                  onSubmitEditing={() => void resetPassword()}
                  placeholder="Confirm new password"
                  showPassword={showConfirmPassword}
                  togglePassword={() => setShowConfirmPassword((current) => !current)}
                  value={confirmPassword}
                />

                <Text selectable style={styles.passwordHint}>
                  Use at least 8 characters. Both passwords must match.
                </Text>

                {errorMessage ? (
                  <Text accessibilityRole="alert" selectable style={styles.errorText}>
                    {errorMessage}
                  </Text>
                ) : null}

                <PrimaryButton
                  disabled={!canResetPassword}
                  label={isSubmitting ? 'Resetting password…' : 'Reset password'}
                  onPress={() => void resetPassword()}
                />

                <Pressable
                  accessibilityLabel="Resend reset code"
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => void requestResetCode()}
                  style={({ pressed }) => [styles.textButton, pressed && styles.textButtonPressed]}
                >
                  <Text style={styles.textButtonLabel}>Resend code</Text>
                </Pressable>
              </>
            )}

            {errorMessage && step === 'request' ? (
              <Text accessibilityRole="alert" selectable style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel="Return to sign in"
              accessibilityRole="button"
              onPress={handleBack}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.textButtonPressed]}
            >
              <Text style={styles.cancelButtonLabel}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type PasswordInputProps = {
  accessibilityLabel: string;
  editable: boolean;
  onChangeText: (value: string) => void;
  onSubmitEditing: () => void;
  placeholder: string;
  showPassword: boolean;
  togglePassword: () => void;
  value: string;
};

function PasswordInput({
  accessibilityLabel,
  editable,
  onChangeText,
  onSubmitEditing,
  placeholder,
  showPassword,
  togglePassword,
  value,
}: PasswordInputProps) {
  return (
    <View style={styles.passwordContainer}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoComplete="new-password"
        editable={editable}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor="#9AA2B1"
        secureTextEntry={!showPassword}
        style={styles.passwordInput}
        value={value}
      />
      <Pressable
        accessibilityLabel={`${showPassword ? 'Hide' : 'Show'} ${placeholder.toLowerCase()}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={togglePassword}
        style={({ pressed }) => [styles.eyeButton, pressed && styles.textButtonPressed]}
      >
        <Lucide name={showPassword ? 'eye-off' : 'eye'} size={22} color="#9AA2B1" />
      </Pressable>
    </View>
  );
}

type PrimaryButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
};

function PrimaryButton({ disabled, label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.primaryButtonPressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  logo: {
    width: 112,
    height: 112,
    alignSelf: 'center',
    marginBottom: 20,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  heading: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    minHeight: 56,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 18,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    color: COLORS.text,
    fontWeight: '500',
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 5,
    fontWeight: '800',
  },
  passwordContainer: {
    minHeight: 56,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  passwordHint: {
    marginTop: -8,
    color: COLORS.muted,
    fontSize: 13,
  },
  statusText: {
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
    color: COLORS.successText,
    backgroundColor: COLORS.successBackground,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorText: {
    color: '#C43D3D',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 8,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: COLORS.blue,
    boxShadow: `0 4px 0 ${COLORS.blueDark}`,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.disabled,
    boxShadow: `0 4px 0 ${COLORS.disabledShadow}`,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.92,
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: COLORS.blueDark,
    fontSize: 15,
    fontWeight: '800',
  },
  cancelButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonLabel: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  textButtonPressed: {
    opacity: 0.6,
  },
});

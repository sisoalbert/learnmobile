import { useAuthActions } from '@convex-dev/auth/react';
import * as Sentry from '@sentry/react-native';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lucide } from '@react-native-vector-icons/lucide';

import { Header } from '@/common';
import { useSessionStore } from '@/state/sessionStore';

const COLORS = {
  blue: '#1CB0F6',
  blueDark: '#1899D6',
  surface: '#FFFFFF',
  text: '#4B4B4B',
  inputBorder: '#E5E5E5',
  inputBackground: '#F7F7F9',
  disabled: '#E5E5E5',
  disabledShadow: '#CECECE',
};

export default function SignUpScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const setAuthenticatedUser = useSessionStore((state) => state.setAuthenticatedUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isFormValid = normalizedEmail.length > 0 && password.length >= 8;

  const handleSignUp = async () => {
    if (!isFormValid || isSubmitting) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await signIn('password', {
        email: normalizedEmail,
        password,
        flow: 'signUp',
      });

      if (!result.signingIn) {
        Sentry.captureMessage('Auth sign up did not complete', {
          level: 'warning',
          tags: {
            area: 'auth',
            operation: 'sign_up',
          },
        });
        setErrorMessage('We could not complete sign up. Please try again.');
        return;
      }

      setAuthenticatedUser({ id: normalizedEmail, email: normalizedEmail });
      router.replace('/home');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      Sentry.captureMessage(message, {
        level: 'warning',
        tags: {
          area: 'auth',
          operation: 'sign_up',
        },
      });
      setErrorMessage(getAuthErrorMessage(error, 'Unable to create your account.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => router.replace('/')} />
      <View style={styles.content}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9AA2B1"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setErrorMessage('');
            }}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#9AA2B1"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!isSubmitting}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setErrorMessage('');
              }}
              onSubmitEditing={() => void handleSignUp()}
            />
            <Pressable
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowPassword((prev) => !prev)}
              style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
            >
              <Lucide
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#9AA2B1"
              />
            </Pressable>
          </View>

          <Text selectable style={styles.passwordHint}>
            Use at least 8 characters.
          </Text>

          {errorMessage ? (
            <Text accessibilityRole="alert" selectable style={styles.errorText}>
              {errorMessage}
            </Text>
          ) : null}
          
          <Pressable 
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              (!isFormValid || isSubmitting) && styles.primaryButtonDisabled,
              pressed && isFormValid && !isSubmitting && styles.primaryButtonPressed,
            ]}
            disabled={!isFormValid || isSubmitting}
            onPress={() => void handleSignUp()}
          >
            <Text selectable style={styles.primaryButtonText}>
              {isSubmitting ? 'Creating account…' : 'Sign Up'}
            </Text>
          </Pressable>

          <View style={styles.alternateAction}>
            <Text selectable style={styles.alternateText}>Already have an account?</Text>
            <Link href="/signin" replace style={styles.alternateLink}>
              Sign in
            </Link>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 40,
  },
  form: {
    width: '100%',
    gap: 16,
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
  eyeButtonPressed: {
    opacity: 0.6,
  },
  passwordHint: {
    marginTop: -8,
    color: '#737D91',
    fontSize: 13,
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
  alternateAction: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  alternateText: {
    color: '#737D91',
    fontSize: 15,
  },
  alternateLink: {
    color: COLORS.blueDark,
    fontSize: 15,
    fontWeight: '800',
  },
});

function getAuthErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';

  if (message.toLowerCase().includes('already')) {
    return 'An account with this email already exists. Try signing in.';
  }

  return fallback;
}

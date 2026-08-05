import { useAuthActions } from '@convex-dev/auth/react';
import { Lucide } from '@react-native-vector-icons/lucide';
import * as Sentry from '@sentry/react-native';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const setAuthenticatedUser = useSessionStore((state) => state.setAuthenticatedUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawDeployment =
    process.env.EXPO_PUBLIC_CONVEX_DEPLOYMENT ||
    process.env.CONVEX_DEPLOYMENT ||
    (process.env.EXPO_PUBLIC_CONVEX_URL
      ? process.env.EXPO_PUBLIC_CONVEX_URL.replace(/^https?:\/\//, '').replace(/\.convex\.(cloud|site)$/, '')
      : 'prod:laudable-labrador-921');

  const deploymentName =
    rawDeployment.startsWith('dev:') || rawDeployment.startsWith('prod:')
      ? rawDeployment
      : `prod:${rawDeployment}`;

  const normalizedEmail = email.trim().toLowerCase();
  const isFormValid = normalizedEmail.length > 0 && password.length > 0;

  const handleSignIn = async () => {
    if (!isFormValid || isSubmitting) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const result = await signIn('password', {
        email: normalizedEmail,
        password,
        flow: 'signIn',
      });

      if (!result.signingIn) {
        Sentry.captureMessage('Auth sign in did not complete', {
          level: 'warning',
          tags: {
            area: 'auth',
            operation: 'sign_in',
          },
        });
        setErrorMessage('We could not complete sign in. Please try again.');
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
          operation: 'sign_in',
        },
      });
      setErrorMessage('Incorrect email or password.');
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
          <Text selectable style={styles.devModeBadge}>
            {deploymentName}
          </Text>
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
              autoComplete="current-password"
              editable={!isSubmitting}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setErrorMessage('');
              }}
              onSubmitEditing={() => void handleSignIn()}
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

          <Link href="/forgot-password" style={styles.forgotPasswordLink}>
            Forgot password?
          </Link>

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
            onPress={() => void handleSignIn()}
          >
            <Text selectable style={styles.primaryButtonText}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Text>
          </Pressable>

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
  devModeBadge: {
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    letterSpacing: 0.5,
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
  errorText: {
    color: '#C43D3D',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    color: COLORS.blueDark,
    fontSize: 14,
    fontWeight: '800',
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
});

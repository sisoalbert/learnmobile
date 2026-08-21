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
import { Lucide } from '@react-native-vector-icons/lucide';

import { Header } from '@/common';
import { goBackOrReplace } from '@/navigation/go-back-or-replace';

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

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail);

  const requestDeletion = async () => {
    if (!isEmailValid || isSubmitting) return;

    setErrorMessage('');
    setStatusMessage('');
    setIsSubmitting(true);

    try {
      const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
      if (!siteUrl) {
        throw new Error('EXPO_PUBLIC_CONVEX_SITE_URL is not configured');
      }

      const response = await fetch(`${siteUrl}/request-account-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to request account deletion');
      }

      setStatusMessage('Check ' + normalizedEmail + ' for a confirmation link. The link expires in 30 minutes.');
      setEmail('');
    } catch {
      setErrorMessage('Something went wrong. Please try again later.');
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
          <View style={styles.form}>
            <View style={styles.heading}>
              <Lucide name="user-x" size={64} color="#C43D3D" style={{ marginBottom: 16 }} />
              <Text selectable style={styles.title}>
                Delete your account
              </Text>
              <Text selectable style={styles.description}>
                Enter the email address associated with your account. We will email you a link to verify ownership before the request can be processed.
              </Text>
            </View>

            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={(value) => {
                setEmail(value);
                setErrorMessage('');
                setStatusMessage('');
              }}
              onSubmitEditing={() => void requestDeletion()}
              placeholder="Email"
              placeholderTextColor="#9AA2B1"
              returnKeyType="send"
              style={styles.input}
              value={email}
            />

            {statusMessage ? (
              <Text accessibilityRole="alert" selectable style={styles.statusText}>
                {statusMessage}
              </Text>
            ) : null}

            {errorMessage ? (
              <Text accessibilityRole="alert" selectable style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}

            <PrimaryButton
              disabled={!isEmailValid || isSubmitting}
              label={isSubmitting ? 'Requesting…' : 'Request Deletion'}
              onPress={() => void requestDeletion()}
              isDanger
            />

            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={handleBack}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.textButtonPressed]}
            >
              <Text style={styles.cancelButtonLabel}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type PrimaryButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  isDanger?: boolean;
};

function PrimaryButton({ disabled, label, onPress, isDanger }: PrimaryButtonProps) {
  const bgColor = isDanger ? '#C43D3D' : COLORS.blue;
  const shadowColor = isDanger ? '#8E2828' : COLORS.blueDark;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: bgColor, boxShadow: `0 4px 0 ${shadowColor}` },
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

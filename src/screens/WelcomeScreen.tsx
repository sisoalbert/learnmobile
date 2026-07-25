import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import WelcomeAnimation from '@/common/WelcomeAnimation';
import { useSessionStore } from '@/state/sessionStore';
import { useOnboardingStore } from '@/state/onboarding-store';

export default function WelcomeScreen() {
  const router = useRouter();
  const continueAsGuest = useSessionStore((state) => state.continueAsGuest);
  const hasHydrated = useOnboardingStore((state) => state.hasHydrated);
  const isOnboardingCompleted = useOnboardingStore((state) => state.isCompleted);

  const handleGetStarted = () => {
    if (!hasHydrated) return;

    continueAsGuest();
    if (isOnboardingCompleted) {
      router.replace('/home');
    } else {
      router.push('/onboarding');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <WelcomeAnimation/>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            accessibilityState={{ disabled: !hasHydrated }}
            disabled={!hasHydrated}
            style={[styles.getStartedButton, !hasHydrated && styles.getStartedButtonDisabled]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/signin')}
            activeOpacity={0.7}
          >
            <Text style={styles.signInText}>I already have an account</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 32,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  getStartedButton: {
    backgroundColor: '#2289FD',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1A6ECE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  getStartedButtonDisabled: {
    opacity: 0.5,
  },
  signInButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  signInText: {
    color: '#1CB0F6',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

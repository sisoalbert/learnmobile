import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Header } from '@/common';
import { useSessionStore } from '@/state/sessionStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const continueAsGuest = useSessionStore((state) => state.continueAsGuest);

  const handleContinue = () => {
    continueAsGuest();
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.welcomeText}>Welcome</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.homeButtonText}>Continue as guest</Text>
        </TouchableOpacity>
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
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4B4B4B',
    textAlign: 'center',
    marginBottom: 24,
  },
  homeButton: {
    backgroundColor: '#2289FD',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#1A6ECE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

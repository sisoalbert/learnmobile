import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, Text, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isFormValid = email.length > 0 && password.length > 0;

  const handleSignUp = () => {
    Alert.alert('Sign Up', 'Sign up functionality not implemented yet.');
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
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9AA2B1"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9AA2B1"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          
          <Pressable 
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              !isFormValid && styles.primaryButtonDisabled,
              pressed && isFormValid && styles.primaryButtonPressed,
            ]}
            disabled={!isFormValid}
            onPress={handleSignUp}
          >
            <Text selectable style={styles.primaryButtonText}>Sign Up</Text>
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

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';

export default function SignInScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
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
  },
});

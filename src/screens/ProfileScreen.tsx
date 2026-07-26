import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { Header } from '@/common';
import WelcomeAnimation from '@/common/WelcomeAnimation';

export default function ProfileScreen({
  name,
  showSettings = false,
}: {
  name: string;
  showSettings?: boolean;
}) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header showSettings={showSettings} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <WelcomeAnimation />
        <Text selectable style={styles.title}>
          {name}
        </Text>
        <Link href="/todo" style={styles.link}>
          View Todos
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 56,
  },
  title: {
    color: '#4B4B4B',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: {
    marginTop: 16,
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

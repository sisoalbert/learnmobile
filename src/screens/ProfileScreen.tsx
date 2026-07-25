import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';

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
        <Text selectable style={styles.title}>
          {name}
        </Text>
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
});

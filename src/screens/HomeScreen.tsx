import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionStore } from '@/state/sessionStore';

export default function HomeScreen() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const user = useSessionStore((state) => state.user);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Home (Learning Path)</Text>
        <Text style={styles.sessionText}>
          {isAuthenticated
            ? `Signed in${user?.name ? ` as ${user.name}` : ''}`
            : 'Continuing as guest'}
        </Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4B4B4B',
    textAlign: 'center',
  },
  sessionText: {
    marginTop: 8,
    color: '#777777',
    fontSize: 15,
    textAlign: 'center',
  },
});

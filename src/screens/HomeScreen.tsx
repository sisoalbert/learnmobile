import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Lucide } from '@react-native-vector-icons/lucide';

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
        <Link href="/profile" asChild>
          <Pressable accessibilityRole="link" style={styles.profileLink}>
            <Lucide name="user" size={22} color="#FFFFFF" />
            <Text style={styles.profileLinkText}>VIEW PROFILE</Text>
          </Pressable>
        </Link>
        <Link href={'/question-types' as never} asChild>
          <Pressable accessibilityRole="link" style={styles.questionTypesLink}>
            <Lucide name="shapes" size={22} color="#2289FD" />
            <Text style={styles.questionTypesLinkText}>EXPLORE QUESTION TYPES</Text>
          </Pressable>
        </Link>
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
  profileLink: {
    marginTop: 24,
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#2289FD',
    boxShadow: '0 4px 0 #1A6ECE',
  },
  profileLinkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  questionTypesLink: {
    marginTop: 14,
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#2289FD',
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#EAF4FF',
  },
  questionTypesLinkText: {
    color: '#1A6ECE',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

import { Lucide } from '@react-native-vector-icons/lucide';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { goBackOrReplace } from '@/navigation/go-back-or-replace';

import type { ComingSoonLearningPath } from './learning-paths';

export function ComingSoonPathScreen({ path }: { path: ComingSoonLearningPath }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Back to learning paths"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => goBackOrReplace('/home')}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Lucide name="arrow-left" size={24} color="#667085" />
        </Pressable>

        <View style={[styles.heroIcon, { backgroundColor: path.softColor }]}>
          <Lucide name="construction" size={42} color={path.accent} />
        </View>

        <View style={styles.headingGroup}>
          <View style={[styles.statusPill, { backgroundColor: path.softColor }]}>
            <Text selectable style={[styles.statusText, { color: path.accent }]}>COMING SOON</Text>
          </View>
          <Text selectable style={styles.title}>{path.title}</Text>
          <Text selectable style={styles.goal}>{path.goal}</Text>
        </View>

        <View style={styles.topicCard}>
          <Text selectable style={styles.topicHeading}>Topics you’ll learn</Text>
          <View style={styles.topicList}>
            {path.topics.map((topic) => (
              <View key={topic} style={styles.topicRow}>
                <View style={[styles.checkCircle, { backgroundColor: path.softColor }]}>
                  <Lucide name="check" size={15} color={path.accent} />
                </View>
                <Text selectable style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.releaseCard}>
          <Lucide name="sparkles" size={20} color={path.accent} />
          <View style={styles.releaseCopy}>
            <Text selectable style={styles.releaseTitle}>We’re building this path next</Text>
            <Text selectable style={styles.releaseText}>{path.releaseMessage}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => goBackOrReplace('/home')}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: path.accent }, pressed && styles.pressed]}
        >
          <Text selectable style={styles.primaryButtonText}>BACK TO LEARNING PATHS</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: 24, paddingHorizontal: 22, paddingVertical: 18 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#FFFFFF', boxShadow: '0 3px 12px rgba(23, 33, 59, 0.08)' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  heroIcon: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderRadius: 28, borderCurve: 'continuous' },
  headingGroup: { alignItems: 'center', gap: 10 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#17213B', fontSize: 36, fontWeight: '900', textAlign: 'center' },
  goal: { maxWidth: 480, color: '#657087', fontSize: 18, lineHeight: 27, textAlign: 'center' },
  topicCard: { gap: 18, padding: 22, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: '0 8px 26px rgba(23, 33, 59, 0.06)' },
  topicHeading: { color: '#17213B', fontSize: 18, fontWeight: '800' },
  topicList: { gap: 14 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  topicText: { flex: 1, color: '#344054', fontSize: 16, fontWeight: '600' },
  releaseCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 18, borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  releaseCopy: { flex: 1, gap: 4 },
  releaseTitle: { color: '#344054', fontSize: 15, fontWeight: '800' },
  releaseText: { color: '#7A8498', fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 16, borderRadius: 16, borderCurve: 'continuous', boxShadow: '0 4px 0 rgba(23, 33, 59, 0.18)' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});

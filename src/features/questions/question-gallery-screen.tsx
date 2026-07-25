import { Lucide } from '@react-native-vector-icons/lucide';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QUESTION_COLORS, QUESTION_TYPE_META, QUESTION_TYPES } from './question-constants';
import { QUESTION_FIXTURES_BY_TYPE } from './question-fixtures';
import { goBackOrReplace } from './question-navigation';

export default function QuestionGalleryScreen() {
  const { width } = useWindowDimensions();
  const columns = width >= 760 ? 2 : 1;
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => goBackOrReplace('/home')} style={styles.backButton}><Lucide name="arrow-left" size={23} color={QUESTION_COLORS.muted} /></Pressable>
          <View style={styles.headerCopy}>
            <Text selectable style={styles.title}>14 Question Types ✨</Text>
            <Text selectable style={styles.subtitle}>Practice. Build. Ship. Become an Expo expert.</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {QUESTION_TYPES.map((type, index) => {
            const meta = QUESTION_TYPE_META[type];
            const question = QUESTION_FIXTURES_BY_TYPE[type];
            return (
              <Pressable key={type} accessibilityRole="link" onPress={() => router.push({ pathname: '/question-types/[type]', params: { type } } as never)} style={({ pressed }) => [styles.card, { width: columns === 2 ? '48.5%' : '100%', borderColor: meta.color, backgroundColor: meta.softColor }, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.number, { backgroundColor: meta.color }]}><Text selectable style={styles.numberText}>{index + 1}</Text></View>
                  <Text selectable style={styles.cardTitle}>{meta.label}</Text>
                  <Lucide name="chevron-right" size={20} color={meta.color} />
                </View>
                <Text selectable numberOfLines={2} style={styles.prompt}>{question.prompt}</Text>
                <View style={styles.cardFooter}><Text selectable style={[styles.xp, { color: meta.color }]}>{question.xp} XP</Text><Text selectable style={styles.difficulty}>{question.difficulty}</Text></View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 940, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#F0F2F5' },
  headerCopy: { flex: 1, gap: 5 },
  title: { color: QUESTION_COLORS.ink, fontSize: 28, fontWeight: '900', lineHeight: 34 },
  subtitle: { color: QUESTION_COLORS.muted, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { minHeight: 150, justifyContent: 'space-between', gap: 12, padding: 16, borderWidth: 1, borderRadius: 20, borderCurve: 'continuous', boxShadow: '0 4px 16px rgba(23,33,59,0.06)' },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  numberText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  cardTitle: { flex: 1, color: QUESTION_COLORS.ink, fontSize: 16, fontWeight: '800' },
  prompt: { color: '#414A60', fontSize: 14, lineHeight: 21 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xp: { fontSize: 12, fontWeight: '800' },
  difficulty: { color: QUESTION_COLORS.muted, fontSize: 12, textTransform: 'capitalize' },
});

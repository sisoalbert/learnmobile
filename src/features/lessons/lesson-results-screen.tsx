import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const RESULTS = [
  { label: 'Total XP', value: '23', icon: 'zap', color: '#D88700', background: '#FFF6DC' },
  { label: 'Great', value: '93%', detail: 'accuracy', icon: 'target', color: '#2289FD', background: '#EAF4FF' },
  { label: 'Speedy', value: '2:49', detail: 'completion time', icon: 'timer', color: '#8C5BD6', background: '#F3ECFF' },
] satisfies {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIconName;
  color: string;
  background: string;
}[];

export default function LessonResultsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Animated.View entering={ZoomIn.duration(280)} style={styles.mascotHalo}>
            <Image
              accessibilityLabel="Rex celebrating your lesson results"
              contentFit="contain"
              source={require('../../../assets/logo.png')}
              style={styles.mascot}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(260)} style={styles.copy}>
            <Text selectable style={styles.title}>Learning legend!</Text>
            <Text selectable style={styles.subtitle}>You just completed your first lesson!</Text>
          </Animated.View>

          <View style={styles.results}>
            {RESULTS.map((result, index) => (
              <Animated.View
                entering={FadeInUp.delay(210 + index * 70).duration(260)}
                key={result.label}
                style={[styles.resultCard, { backgroundColor: result.background }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
                  <Lucide name={result.icon} size={24} color={result.color} />
                </View>
                <View style={styles.resultCopy}>
                  <Text selectable style={[styles.resultValue, { color: result.color }]}>{result.value}</Text>
                  <Text selectable style={styles.resultLabel}>{result.label}</Text>
                  {result.detail ? <Text selectable style={styles.resultDetail}>{result.detail}</Text> : null}
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/learning-goal' as never)}
          style={({ pressed }) => [styles.homeButton, pressed && styles.homeButtonPressed]}
        >
          <Text selectable style={styles.homeButtonText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    justifyContent: 'space-between',
    gap: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  summary: { alignItems: 'center', gap: 24 },
  mascotHalo: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 85,
    backgroundColor: '#EAF4FF',
  },
  mascot: { width: 148, height: 148 },
  copy: { alignItems: 'center', gap: 8 },
  title: {
    color: '#17213B',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  subtitle: { color: '#737D91', fontSize: 17, fontWeight: '600', lineHeight: 24, textAlign: 'center' },
  results: { width: '100%', flexDirection: 'row', gap: 10 },
  resultCard: {
    flex: 1,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  iconCircle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  resultCopy: { alignItems: 'center', gap: 2 },
  resultValue: { fontSize: 25, fontWeight: '900', fontVariant: ['tabular-nums'] },
  resultLabel: { color: '#344054', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  resultDetail: { color: '#7A8498', fontSize: 10.5, fontWeight: '600', textAlign: 'center' },
  homeButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#2289FD',
    boxShadow: '0 4px 0 #1A6ECE',
  },
  homeButtonPressed: { opacity: 0.88, transform: [{ translateY: 2 }] },
  homeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },
});

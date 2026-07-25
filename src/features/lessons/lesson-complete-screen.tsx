import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { BounceIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const CELEBRATION_DURATION_MS = 1800;

export default function LessonCompleteScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/lessons/results' as never);
    }, CELEBRATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        accessibilityLabel="Lesson complete celebration"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.celebrationStage}>
          <View style={styles.burst} />
          <MotionStreak width={92} top="19%" left="4%" rotation="-10deg" />
          <MotionStreak width={66} top="31%" left="0%" rotation="-6deg" />
          <MotionStreak width={74} top="65%" right="2%" rotation="8deg" />
          <MotionStreak width={48} top="75%" right="12%" rotation="12deg" />

          <Animated.View entering={BounceIn.duration(650).springify()} style={styles.mascotWrap}>
            <Image
              accessibilityLabel="Rex celebrating the completed lesson"
              contentFit="contain"
              source={require('../../../assets/logo.png')}
              style={styles.mascot}
            />
          </Animated.View>
        </View>

        <Animated.Text entering={FadeInUp.delay(350).duration(280)} selectable style={styles.title}>
          Lesson complete!
        </Animated.Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MotionStreak({
  width,
  top,
  left,
  right,
  rotation,
}: {
  width: number;
  top: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  rotation: `${number}deg`;
}) {
  return (
    <View
      style={[
        styles.motionStreak,
        { width, top, left, right, transform: [{ rotate: rotation }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 56,
  },
  celebrationStage: {
    flex: 1,
    width: '100%',
    minHeight: 430,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: '#EAF4FF',
    transform: [{ scaleX: 1.08 }],
  },
  mascotWrap: {
    width: '86%',
    maxWidth: 430,
    aspectRatio: 1,
    transform: [{ rotate: '-7deg' }, { translateX: 14 }],
  },
  mascot: { width: '100%', height: '100%' },
  motionStreak: {
    position: 'absolute',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2289FD',
    opacity: 0.55,
  },
  title: {
    color: '#17213B',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 45,
    textAlign: 'center',
  },
});

export { CELEBRATION_DURATION_MS };

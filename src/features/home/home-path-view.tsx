/* eslint-disable react-hooks/immutability -- Reanimated SharedValues are intentionally mutated in interaction callbacks. */
import { Lucide } from '@react-native-vector-icons/lucide';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import type { LessonNode, PathUnit, PublishedCourse } from './home-path';

const REX = require('../../../assets/generated/logo.png');
const NODE_SIZE = 76;
const NODE_RADIUS = NODE_SIZE / 2;
const PATH_MAX_WIDTH = 520;
const PATH_X_PATTERN = [0.34, 0.68, 0.29, 0.67, 0.35];

type NodePosition = { x: number; y: number };

export function ProgressHeader({
  hearts,
  streak,
  totalXp,
}: {
  hearts: number;
  streak: number;
  totalXp: number;
}) {
  return (
    <View style={styles.progressHeader}>
      <View accessibilityLabel="Learn Expo Rex" accessibilityRole="image" style={styles.brandMark}>
        <Image contentFit="contain" source={REX} style={styles.brandImage} />
      </View>
      <View style={styles.counterRow}>
        <ProgressCounter color="#F59E0B" icon="flame" label="day streak" value={streak} />
        <ProgressCounter color="#1689EE" icon="zap" label="total XP" value={totalXp} />
        <ProgressCounter color="#EC4899" icon="heart" label="hearts" value={hearts} />
      </View>
    </View>
  );
}

function ProgressCounter({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: 'flame' | 'heart' | 'zap';
  label: string;
  value: number;
}) {
  return (
    <View accessibilityLabel={`${value} ${label}`} style={styles.counter}>
      <Lucide color={color} name={icon} size={20} />
      <Text selectable style={[styles.counterValue, { color }]}>{value}</Text>
    </View>
  );
}

export function UnitCard({
  course,
  courseNumber,
  unit,
  unitNumber,
}: {
  course: PublishedCourse;
  courseNumber: number;
  unit: PathUnit;
  unitNumber: number;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel={`Open ${course.title} course overview`}
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/courses/[courseKey]', params: { courseKey: course.key } })}
      style={({ pressed }) => [styles.unitCard, pressed && styles.pressed]}
    >
      <View style={styles.unitCopy}>
        <Text selectable style={styles.unitEyebrow}>COURSE {courseNumber} · UNIT {unitNumber}</Text>
        <Text selectable style={styles.unitTitle}>{course.title}</Text>
        <Text selectable numberOfLines={1} style={styles.unitSubtitle}>{unit.title}</Text>
      </View>
      <View style={styles.unitIcon}>
        <Lucide color="#FFFFFF" name="notebook-tabs" size={27} />
      </View>
    </Pressable>
  );
}

export function LessonPath({ lessons }: { lessons: LessonNode[] }) {
  const { width } = useWindowDimensions();
  const pathWidth = Math.min(Math.max(288, width - 32), PATH_MAX_WIDTH);
  const positions = lessons.map((_, index) => ({
    x: pathWidth * PATH_X_PATTERN[index % PATH_X_PATTERN.length],
    y: 72 + index * 154,
  }));
  const lastY = positions.at(-1)?.y ?? 72;
  const pathHeight = Math.max(480, lastY + 220);

  return (
    <View accessibilityLabel="Current lesson path" style={[styles.pathContainer, { width: pathWidth, height: pathHeight }]}>
      <PathGraphics height={pathHeight} positions={positions} width={pathWidth} />
      {lessons.map((lesson, index) => (
        <LessonButton key={lesson.key} lesson={lesson} pathWidth={pathWidth} position={positions[index]} />
      ))}
      <Image
        accessible={false}
        contentFit="contain"
        source={REX}
        style={[styles.pathRex, { left: Math.max(16, pathWidth - 142), top: lastY + 56 }]}
      />
    </View>
  );
}

function PathGraphics({
  height,
  positions,
  width,
}: {
  height: number;
  positions: NodePosition[];
  width: number;
}) {
  const path = positions.reduce((value, position, index) => {
    if (index === 0) return `M ${position.x} ${position.y}`;
    const previous = positions[index - 1];
    const controlOffset = (position.y - previous.y) * 0.52;
    return `${value} C ${previous.x} ${previous.y + controlOffset}, ${position.x} ${position.y - controlOffset}, ${position.x} ${position.y}`;
  }, '');

  return (
    <Svg aria-hidden height={height} style={[StyleSheet.absoluteFill, styles.nonInteractive]} viewBox={`0 0 ${width} ${height}`} width={width}>
      {path ? <Path d={path} fill="none" stroke="#D7DFEA" strokeDasharray="4 10" strokeLinecap="round" strokeWidth={5} /> : null}
      <Circle cx={width * 0.12} cy={height * 0.38} fill="#DCEEFF" r={5} />
      <Circle cx={width * 0.86} cy={height * 0.54} fill="#BDE1FF" r={7} />
      <Path d={`M ${width * 0.13} ${height * 0.72} l 7 11 12 2 -9 9 2 12 -11 -6 -11 6 2 -12 -9 -9 12 -2 z`} fill="#D9E1EC" />
    </Svg>
  );
}

function LessonButton({
  lesson,
  pathWidth,
  position,
}: {
  lesson: LessonNode;
  pathWidth: number;
  position: NodePosition;
}) {
  const router = useRouter();
  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const enabled = lesson.state !== 'locked';
  const accessibilityLabel = `${lesson.title}, ${lesson.state}, ${lesson.xpReward} XP`;
  const button = (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={enabled ? 'link' : 'button'}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={enabled ? () => router.push({ pathname: '/lessons/[lessonKey]', params: { lessonKey: lesson.key } }) : undefined}
      onPressIn={() => { pressScale.value = withSpring(0.93); }}
      onPressOut={() => { pressScale.value = withSpring(1); }}
      style={[
        styles.lessonButton,
        lesson.state === 'completed' && styles.completedLesson,
        lesson.state === 'current' && styles.currentLesson,
        lesson.state === 'locked' && styles.lockedLesson,
        pressStyle,
      ]}
    >
      <Lucide
        color={lesson.state === 'locked' ? '#8D95A2' : '#FFFFFF'}
        name={lesson.state === 'completed' ? 'check' : lesson.state === 'current' ? 'star' : 'lock'}
        size={lesson.state === 'current' ? 31 : 27}
      />
    </AnimatedPressable>
  );

  return (
    <View style={[styles.nodeSlot, { left: position.x - NODE_RADIUS, top: position.y - NODE_RADIUS }]}>
      {lesson.state === 'current' ? <ActiveRing /> : null}
      {button}
      {lesson.state === 'current' ? (
        <ActiveLessonCallout lesson={lesson} nodeX={position.x} pathWidth={pathWidth} />
      ) : null}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ActiveRing() {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      rotation.value = 0;
      scale.value = 1;
      return;
    }
    rotation.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1, false);
    scale.value = withRepeat(withTiming(1.045, { duration: 1150, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(scale);
    };
  }, [reducedMotion, rotation, scale]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const rotationStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View style={[styles.activeRingPulse, pulseStyle]}>
      <Animated.View style={[styles.activeRingRotation, rotationStyle]}>
        <Svg aria-hidden height={98} style={styles.nonInteractive} viewBox="0 0 98 98" width={98}>
          <Circle cx={49} cy={49} fill="none" r={43} stroke="#C9E6FF" strokeWidth={8} />
          <Circle cx={49} cy={49} fill="none" r={43} stroke="#1689EE" strokeDasharray="18 11" strokeLinecap="round" strokeWidth={8} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function ActiveLessonCallout({
  lesson,
  nodeX,
  pathWidth,
}: {
  lesson: LessonNode;
  nodeX: number;
  pathWidth: number;
}) {
  const placeRight = nodeX <= pathWidth / 2;
  return (
    <View style={[styles.callout, placeRight ? styles.calloutRight : styles.calloutLeft]}>
      <Text selectable style={styles.calloutStatus}>CURRENT LESSON</Text>
      <Text selectable numberOfLines={2} style={styles.calloutTitle}>{lesson.title}</Text>
      <Text selectable style={styles.calloutXp}>{lesson.xpReward} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressHeader: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, borderColor: '#E4EAF2', borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: '0 8px 24px rgba(20, 41, 75, 0.07)' },
  brandMark: { width: 50, height: 50, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#0F2747' },
  brandImage: { width: 42, height: 42 },
  counterRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 4 },
  counter: { minWidth: 62, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 5, borderRadius: 13 },
  counterValue: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  unitCard: { minHeight: 126, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden', borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#1689EE', boxShadow: '0 8px 0 rgba(8, 91, 166, 0.22)' },
  unitCopy: { flex: 1, justifyContent: 'center', gap: 5, paddingHorizontal: 21, paddingVertical: 18 },
  unitEyebrow: { color: '#CBE8FF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  unitTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', letterSpacing: -0.3 },
  unitSubtitle: { color: '#E6F4FF', fontSize: 13, fontWeight: '700' },
  unitIcon: { width: 68, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255, 255, 255, 0.2)', backgroundColor: 'rgba(0, 91, 184, 0.18)' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  pathContainer: { position: 'relative', alignSelf: 'center', overflow: 'hidden' },
  nonInteractive: { pointerEvents: 'none' },
  pathRex: { position: 'absolute', width: 126, height: 126 },
  nodeSlot: { position: 'absolute', width: NODE_SIZE, height: NODE_SIZE, zIndex: 2 },
  lessonButton: { width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: NODE_RADIUS, borderWidth: 7, borderColor: '#FFFFFF', boxShadow: '0 8px 0 rgba(34, 52, 76, 0.17), 0 13px 24px rgba(31, 53, 82, 0.12)' },
  completedLesson: { backgroundColor: '#2FA75A' },
  currentLesson: { backgroundColor: '#1689EE' },
  lockedLesson: { backgroundColor: '#E3E6EA' },
  activeRingPulse: { position: 'absolute', left: -11, top: -11, width: 98, height: 98, zIndex: -1, pointerEvents: 'none' },
  activeRingRotation: { width: 98, height: 98 },
  callout: { position: 'absolute', top: 2, width: 146, gap: 2, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#DCE8F5', borderRadius: 14, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: '0 7px 18px rgba(31, 53, 82, 0.09)' },
  calloutRight: { left: NODE_SIZE + 13 },
  calloutLeft: { right: NODE_SIZE + 13 },
  calloutStatus: { color: '#1689EE', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  calloutTitle: { color: '#1B2940', fontSize: 13, fontWeight: '900', lineHeight: 17 },
  calloutXp: { color: '#7B8798', fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

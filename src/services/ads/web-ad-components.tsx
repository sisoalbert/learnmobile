import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { feedback } from '@/services/feedback';

export function WebProBanner() {
  const router = useRouter();

  return (
    <View accessibilityLabel="Subscribe to Pro banner" style={styles.banner}>
      <View style={styles.bannerGraphic}>
        <Svg accessibilityLabel="Pro sparkle" height={34} viewBox="0 0 48 48" width={34}>
          <Circle cx="24" cy="24" fill="#E9D5FF" r="20" />
          <Path d="m24 11 3.2 8.8L36 23l-8.8 3.2L24 35l-3.2-8.8L12 23l8.8-3.2L24 11Z" fill="#8C5BD6" />
        </Svg>
      </View>
      <View style={styles.bannerCopy}>
        <Text selectable style={styles.bannerTitle}>Subscribe to Pro</Text>
        <Text selectable style={styles.bannerSubtitle}>Learn without interruptions.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Subscribe to Pro"
        onPress={() => {
          feedback.play('buttonTap');
          router.push('/subscription');
        }}
        style={({ pressed }) => [styles.bannerButton, pressed && styles.pressed]}
      >
        <Text selectable style={styles.bannerButtonText}>VIEW PLANS</Text>
      </Pressable>
    </View>
  );
}

export function WebInterstitialCard() {
  return (
    <View accessibilityLabel="Subscribe to Pro offer" style={styles.interstitialCard}>
      <View style={styles.interstitialGraphic}>
        <Svg accessibilityLabel="Pro crown" height={92} viewBox="0 0 120 100" width={112}>
          <Circle cx="60" cy="50" fill="#F3ECFF" r="45" />
          <Path d="m30 40 14 13 16-25 16 25 14-13-7 34H37l-7-34Z" fill="#8C5BD6" />
          <Path d="M37 76h46" stroke="#5E35A4" strokeLinecap="round" strokeWidth="6" />
          <Circle cx="44" cy="39" fill="#F8C84E" r="5" />
          <Circle cx="76" cy="39" fill="#F8C84E" r="5" />
        </Svg>
      </View>
      <Text selectable style={styles.interstitialEyebrow}>LEARN EXPO PRO</Text>
      <Text selectable style={styles.interstitialTitle}>Keep your learning streak uninterrupted</Text>
      <Text selectable style={styles.interstitialBody}>Unlock ad-free lessons, unlimited practice, and more time to build.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FBF8FF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E9D5FF',
  },
  bannerGraphic: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#F3ECFF',
  },
  bannerCopy: { flex: 1, gap: 2 },
  bannerTitle: { color: '#5E35A4', fontSize: 14, fontWeight: '900' },
  bannerSubtitle: { color: '#7A6A92', fontSize: 12, fontWeight: '600' },
  bannerButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#8C5BD6',
  },
  bannerButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  pressed: { opacity: 0.78 },
  interstitialCard: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#FBF8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  interstitialGraphic: {
    width: 116,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interstitialEyebrow: { color: '#8C5BD6', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  interstitialTitle: { color: '#34234F', fontSize: 22, fontWeight: '900', lineHeight: 28, textAlign: 'center' },
  interstitialBody: { color: '#7A6A92', fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center' },
});

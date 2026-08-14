import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';

import WelcomeAnimation from '@/common/WelcomeAnimation';
import { feedback } from '@/services/feedback';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  const handleSubscribe = () => {
    feedback.play('buttonTap');
    router.back();
  };

  const handleClose = () => {
    feedback.play('buttonTap');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close subscription screen"
            accessibilityRole="button"
            onPress={handleClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Lucide name="x" size={24} color="#737373" />
          </Pressable>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
        <View style={styles.heroSection}>
          <View style={styles.animationWrapper}>
            <WelcomeAnimation style={styles.lottieAnimation} />
          </View>
          <Text style={styles.superTitle}>LEARN EXPO SUPER</Text>
          <Text style={styles.mainTitle}>Unlock Your Full Potential</Text>
          <Text style={styles.subtitle}>
            Accelerate your mobile app development skills with unlimited practice and ad-free learning.
          </Text>
        </View>

        <View style={styles.benefitsContainer}>
          <BenefitRow
            icon="zap"
            title="Unlimited Hearts & Practice"
            description="Never get interrupted when making mistakes while learning."
          />
          <BenefitRow
            icon="shield-check"
            title="100% Ad-Free Experience"
            description="Focus entirely on building Expo apps without distractions."
          />
          <BenefitRow
            icon="sparkles"
            title="Personalized Review"
            description="Target your weak areas with AI-curated practice sessions."
          />
          <BenefitRow
            icon="download"
            title="Offline Learning Mode"
            description="Download lessons and practice anytime, anywhere."
          />
        </View>

        <View style={styles.plansContainer}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedPlan === 'annual' }}
            onPress={() => {
              feedback.play('optionSelected');
              setSelectedPlan('annual');
            }}
            style={({ pressed }) => [
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>BEST VALUE - SAVE 50%</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>12 Months</Text>
              <Text style={styles.planPrice}>$4.99 / mo</Text>
            </View>
            <Text style={styles.planBilled}>$59.99 billed annually after 7-day free trial</Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedPlan === 'monthly' }}
            onPress={() => {
              feedback.play('optionSelected');
              setSelectedPlan('monthly');
            }}
            style={({ pressed }) => [
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>1 Month</Text>
              <Text style={styles.planPrice}>$9.99 / mo</Text>
            </View>
            <Text style={styles.planBilled}>Billed monthly, cancel anytime</Text>
          </Pressable>
        </View>
      </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={handleSubscribe}
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          >
            <Text style={styles.ctaButtonText}>
              {selectedPlan === 'annual' ? 'START 7-DAY FREE TRIAL' : 'SUBSCRIBE NOW'}
            </Text>
          </Pressable>
          <Text style={styles.legalNotice}>
            Recurring billing. Cancel anytime in App Store settings.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function BenefitRow({
  icon,
  title,
  description,
}: {
  icon: LucideIconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIconContainer}>
        <Lucide name={icon} size={22} color="#2289FD" />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  header: {
    height: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  heroSection: {
    alignItems: 'center',
    gap: 8,
  },
  animationWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  lottieAnimation: {
    width: 180,
    height: 180,
  },
  superTitle: {
    color: '#8C5BD6',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  mainTitle: {
    color: '#17213B',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#737373',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },
  benefitsContainer: {
    gap: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopy: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    color: '#2D2D2D',
    fontSize: 15,
    fontWeight: '800',
  },
  benefitDescription: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    gap: 6,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#2289FD',
    backgroundColor: '#EAF4FF',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#8C5BD6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    color: '#2D2D2D',
    fontSize: 17,
    fontWeight: '800',
  },
  planPrice: {
    color: '#2289FD',
    fontSize: 17,
    fontWeight: '900',
  },
  planBilled: {
    color: '#737373',
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  ctaButton: {
    minHeight: 54,
    backgroundColor: '#2289FD',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 0 #1A6ECE',
  },
  ctaButtonPressed: {
    transform: [{ translateY: 2 }],
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  legalNotice: {
    color: '#999999',
    fontSize: 11,
    textAlign: 'center',
  },
});

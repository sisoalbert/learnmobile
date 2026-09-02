import { Lucide } from '@react-native-vector-icons/lucide';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { WelcomeAnimation } from '@/common/WelcomeAnimation';
import { feedback } from '@/services/feedback';
import { isNativeRevenueCatPlatform, useRevenueCat } from '@/services/revenuecat';
import { useSessionStore } from '@/state/sessionStore';

export default function SubscriptionScreen() {
  const router = useRouter();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const { customerInfo, errorMessage, hasPro, presentCustomerCenter, presentPaywall, restorePurchases, status } = useRevenueCat();
  const [isOpeningPaywall, setIsOpeningPaywall] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClose = () => {
    feedback.play('buttonTap');
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  const requireAuthenticatedAccount = () => {
    if (isAuthenticated) return true;
    setMessage('Sign in before starting or restoring a subscription.');
    router.push('/signin');
    return false;
  };

  const handleSubscribe = async () => {
    feedback.play('buttonTap');
    setMessage(null);
    if (!requireAuthenticatedAccount()) return;
    if (!isNativeRevenueCatPlatform) {
      setMessage('Subscriptions are currently available in the Learn Expo mobile app.');
      return;
    }

    setIsOpeningPaywall(true);
    const result = await presentPaywall();
    setIsOpeningPaywall(false);

    if (result === PAYWALL_RESULT.PURCHASED) {
      setMessage('Welcome to Learn Expo Pro!');
    } else if (result === PAYWALL_RESULT.RESTORED) {
      setMessage('Your purchases have been restored.');
    } else if (result === PAYWALL_RESULT.ERROR || result === null) {
      setMessage(errorMessage ?? 'We could not open the paywall. Please try again.');
    }
  };

  const handleRestore = async () => {
    feedback.play('buttonTap');
    setMessage(null);
    if (!requireAuthenticatedAccount()) return;
    if (!isNativeRevenueCatPlatform) {
      setMessage('Restore purchases from the Learn Expo mobile app.');
      return;
    }

    setIsRestoring(true);
    const restoredCustomerInfo = await restorePurchases();
    setIsRestoring(false);
    setMessage(restoredCustomerInfo
      ? 'Your purchase history has been refreshed.'
      : errorMessage ?? 'We could not restore your purchases. Please try again.');
  };

  const handleManageSubscription = async () => {
    feedback.play('buttonTap');
    setMessage(null);
    setIsManagingSubscription(true);
    const opened = await presentCustomerCenter();
    setIsManagingSubscription(false);
    if (!opened) setMessage(errorMessage ?? 'Subscription management is unavailable right now.');
  };

  const isBusy = isOpeningPaywall || isRestoring || isManagingSubscription;
  const actionLabel = hasPro
    ? 'MANAGE SUBSCRIPTION'
    : isOpeningPaywall
      ? 'OPENING PAYWALL…'
      : 'VIEW PRO PLANS';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close subscription screen" accessibilityRole="button" onPress={handleClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Lucide name="x" size={24} color="#737373" />
          </Pressable>
        </View>

        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={styles.animationWrapper}><WelcomeAnimation style={styles.lottieAnimation} /></View>
            <Text style={styles.superTitle}>LEARN EXPO PRO</Text>
            <Text style={styles.mainTitle}>Unlock Your Full Potential</Text>
            <Text style={styles.subtitle}>Learn without interruptions, with unlimited practice and personalized review.</Text>
          </View>

          <View style={styles.benefitsContainer}>
            <BenefitRow icon="zap" title="Unlimited Hearts & Practice" description="Keep learning when mistakes happen." />
            <BenefitRow icon="shield-check" title="100% Ad-Free Experience" description="Focus on each lesson without interruptions." />
            <BenefitRow icon="sparkles" title="Personalized Review" description="Practice the skills that need attention." />
          </View>

          <View style={styles.remotePaywallNote}>
            <Lucide name="badge-check" size={18} color="#2289FD" />
            <Text style={styles.remotePaywallText}>Plans, prices, trials, and purchase options are shown securely in the next step.</Text>
          </View>

          {message ?? errorMessage ? <Text accessibilityRole="alert" style={styles.message}>{message ?? errorMessage}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hasPro ? 'Manage subscription' : 'View Pro plans'}
            disabled={isBusy || status === 'loading'}
            onPress={() => void (hasPro ? handleManageSubscription() : handleSubscribe())}
            style={({ pressed }) => [styles.ctaButton, (pressed || isBusy) && styles.ctaButtonPressed, (isBusy || status === 'loading') && styles.disabled]}
          >
            <Text style={styles.ctaButtonText}>{hasPro && isManagingSubscription ? 'OPENING…' : actionLabel}</Text>
          </Pressable>
          {!hasPro ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Restore purchases" disabled={isBusy} onPress={() => void handleRestore()} style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed, isBusy && styles.disabled]}>
              <Text style={styles.restoreButtonText}>{isRestoring ? 'RESTORING…' : 'RESTORE PURCHASES'}</Text>
            </Pressable>
          ) : null}
          {__DEV__ && (
            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: 'gray', textAlign: 'center' }}>
                DEBUG - hasPro: {String(hasPro)} | status: {status}
              </Text>
              <Text style={{ fontSize: 10, color: 'gray', textAlign: 'center', marginTop: 2 }}>
                Entitlements: {Object.keys(customerInfo?.entitlements.active ?? {}).join(', ') || 'none'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function BenefitRow({ icon, title, description }: { icon: 'shield-check' | 'sparkles' | 'zap'; title: string; description: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIconContainer}><Lucide name={icon} size={22} color="#2289FD" /></View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  page: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { height: 48, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'flex-start' },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24, gap: 24 },
  heroSection: { alignItems: 'center', gap: 8 },
  animationWrapper: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  lottieAnimation: { width: 180, height: 180 },
  superTitle: { color: '#8C5BD6', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  mainTitle: { color: '#17213B', fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { color: '#737373', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  benefitsContainer: { gap: 16, padding: 16, borderRadius: 20, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E5E5' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIconContainer: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EAF4FF', alignItems: 'center', justifyContent: 'center' },
  benefitCopy: { flex: 1, gap: 2 },
  benefitTitle: { color: '#2D2D2D', fontSize: 15, fontWeight: '800' },
  benefitDescription: { color: '#737373', fontSize: 13, lineHeight: 18 },
  remotePaywallNote: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: '#F2F8FF' },
  remotePaywallText: { flex: 1, color: '#356EBD', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  message: { color: '#526078', textAlign: 'center', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  ctaButton: { minHeight: 54, backgroundColor: '#2289FD', borderRadius: 16, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 #1A6ECE' },
  ctaButtonPressed: { transform: [{ translateY: 2 }], opacity: 0.88 },
  ctaButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.6 },
  restoreButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  restoreButtonText: { color: '#356EBD', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  disabled: { opacity: 0.55 },
});

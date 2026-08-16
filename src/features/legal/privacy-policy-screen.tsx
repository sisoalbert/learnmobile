import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { goBackOrReplace } from '@/navigation/go-back-or-replace';

const COLORS = {
  blue: '#2289FD',
  blueSoft: '#EEF7FF',
  border: '#E2E6EC',
  ink: '#17213B',
  muted: '#737D91',
  surface: '#FFFFFF',
};

type PolicySectionProps = PropsWithChildren<{
  icon: LucideIconName;
  title: string;
}>;

function PolicySection({ children, icon, title }: PolicySectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.iconContainer}>
          <Lucide color={COLORS.blue} name={icon} size={19} />
        </View>
        <Text selectable style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Paragraph({ children }: PropsWithChildren) {
  return (
    <Text selectable style={styles.body}>
      {children}
    </Text>
  );
}

function Bullet({ children }: PropsWithChildren) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />
      <Text selectable style={styles.bulletText}>
        {children}
      </Text>
    </View>
  );
}

type SoundEffectAttributionProps = {
  creator: string;
  creatorUrl: string;
  sourceUrl: string;
};

function SoundEffectAttribution({ creator, creatorUrl, sourceUrl }: SoundEffectAttributionProps) {
  return (
    <Paragraph>
      Sound Effect by{' '}
      <Text
        accessibilityRole="link"
        onPress={() => void Linking.openURL(creatorUrl)}
        selectable
        style={styles.link}
      >
        {creator}
      </Text>{' '}
      from{' '}
      <Text
        accessibilityRole="link"
        onPress={() => void Linking.openURL(sourceUrl)}
        selectable
        style={styles.link}
      >
        Pixabay
      </Text>
      .
    </Paragraph>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => goBackOrReplace('/create-profile' as never, router)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Lucide color={COLORS.muted} name="arrow-left" size={25} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introduction}>
            <Text selectable style={styles.title}>
              Privacy Policy
            </Text>
            <Text selectable style={styles.effectiveDate}>
              Effective August 2, 2026
            </Text>
            <Paragraph>
              This policy explains how Learn Expo collects, uses, stores, and shares information
              when you use the app or website.
            </Paragraph>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Lucide color={COLORS.blue} name="shield-check" size={24} />
            </View>
            <View style={styles.summaryCopy}>
              <Text selectable style={styles.summaryTitle}>
                Your learning data stays focused on learning
              </Text>
              <Text selectable style={styles.summaryText}>
                We use your information to run Learn Expo, save your choices, secure your account,
                and improve reliability. We do not sell your personal information or use it for
                third-party advertising.
              </Text>
            </View>
          </View>

          <PolicySection icon="database" title="Information we collect">
            <Bullet>
              Account and profile details you provide, such as your name, age, email address, and
              sign-in credentials.
            </Bullet>
            <Bullet>
              Learning activity and preferences, including onboarding answers, goals, experience
              level, lesson progress, answers, and app settings.
            </Bullet>
            <Bullet>
              Technical and diagnostic information, such as device and operating-system details,
              timezone, IP address, app interactions, crash reports, performance data, and sampled
              session replays used to investigate errors.
            </Bullet>
            <Bullet>
              Information stored on your device, including onboarding choices and the secure token
              used to keep you signed in.
            </Bullet>
          </PolicySection>

          <PolicySection icon="wand-sparkles" title="How we use information">
            <Bullet>Provide, personalize, and maintain the learning experience.</Bullet>
            <Bullet>Create and secure accounts and keep you signed in.</Bullet>
            <Bullet>Save progress, preferences, and learning goals.</Bullet>
            <Bullet>Find bugs, prevent misuse, and improve performance and accessibility.</Bullet>
            <Bullet>Comply with legal obligations and protect users, Learn Expo, and others.</Bullet>
          </PolicySection>

          <PolicySection icon="share-2" title="When information is shared">
            <Paragraph>
              We share information only as needed to operate the service, comply with law, or
              protect rights and safety. Current service providers include Convex for account and
              application services, Resend for account and practice-reminder emails, and Sentry for
              diagnostics, crash reporting, and sampled session replay. These providers process
              information on our behalf under their own security and privacy commitments.
            </Paragraph>
            <Paragraph>
              We may also disclose information if required by law, during a business reorganization,
              or with your direction or consent.
            </Paragraph>
          </PolicySection>

          <PolicySection icon="music" title="Sound effect attributions">
            <Paragraph>
              Learn Expo uses the following sound effects under the creators&apos; Pixabay
              attribution terms:
            </Paragraph>
            <SoundEffectAttribution
              creator="DRAGON-STUDIO"
              creatorUrl="https://pixabay.com/users/dragon-studio-38165424/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=472358"
              sourceUrl="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=472358"
            />
            <SoundEffectAttribution
              creator="freesound_community"
              creatorUrl="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=84419"
              sourceUrl="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=84419"
            />
            <SoundEffectAttribution
              creator="Advik Singh"
              creatorUrl="https://pixabay.com/users/scratchonix-50592769/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=366449"
              sourceUrl="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=366449"
            />
            <SoundEffectAttribution
              creator="Universfield"
              creatorUrl="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=126515"
              sourceUrl="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=126515"
            />
            <SoundEffectAttribution
              creator="Existential Taco"
              creatorUrl="https://pixabay.com/users/existentialtaco-51014313/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=394001"
              sourceUrl="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=394001"
            />
            <SoundEffectAttribution
              creator="SoundShelfStudio"
              creatorUrl="https://pixabay.com/users/soundshelfstudio-46480698/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=513023"
              sourceUrl="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=513023"
            />
          </PolicySection>

          <PolicySection icon="sliders-horizontal" title="Your choices and controls">
            <Bullet>You can use parts of Learn Expo as a guest without creating an account.</Bullet>
            <Bullet>You can reset locally saved onboarding choices from Settings.</Bullet>
            <Bullet>You can enable or disable push and email practice reminders from Settings.</Bullet>
            <Bullet>You may request access to, correction of, or deletion of account information.</Bullet>
            <Bullet>
              Removing the app clears information stored on that device, but does not automatically
              delete an account or information already stored by the service.
            </Bullet>
          </PolicySection>

          <PolicySection icon="lock-keyhole" title="Retention and security">
            <Paragraph>
              We keep information only for as long as it is needed to provide Learn Expo, meet legal
              obligations, resolve disputes, and protect the service. Retention periods can differ by
              data type. We use reasonable technical and organizational safeguards, but no method of
              storage or transmission is completely secure.
            </Paragraph>
          </PolicySection>

          <PolicySection icon="baby" title="Children's privacy">
            <Paragraph>
              A parent or guardian should review a child’s use of Learn Expo and provide any consent
              required by local law before the child creates a profile. If you believe a child has
              provided personal information without required permission, contact us so the
              information can be reviewed and, where appropriate, deleted.
            </Paragraph>
          </PolicySection>

          <PolicySection icon="globe-2" title="International processing">
            <Paragraph>
              Learn Expo and its service providers may process information in countries other than
              the one where you live. Where required, we use appropriate safeguards for these
              transfers.
            </Paragraph>
          </PolicySection>

          <PolicySection icon="refresh-cw" title="Changes to this policy">
            <Paragraph>
              We may update this policy as Learn Expo changes. The effective date at the top will be
              revised when an update is published. If a change is significant, we will provide
              additional notice where required.
            </Paragraph>
          </PolicySection>

          <PolicySection icon="messages-square" title="Contact us">
            <Paragraph>
              To ask a privacy question or request access, correction, or deletion, use the developer
              contact information on the app store listing or distribution page where you obtained
              Learn Expo.
            </Paragraph>
          </PolicySection>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  page: { flex: 1, width: '100%', maxWidth: 700, alignSelf: 'center' },
  header: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 18 },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  content: { gap: 28, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  introduction: { gap: 10 },
  title: { color: COLORS.ink, fontSize: 32, fontWeight: '900', letterSpacing: -0.6 },
  effectiveDate: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: { color: COLORS.muted, fontSize: 16, lineHeight: 25 },
  link: { color: COLORS.blue, textDecorationLine: 'underline' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#CFE7FF',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: COLORS.blueSoft,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: COLORS.surface,
  },
  summaryCopy: { flex: 1, gap: 6 },
  summaryTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800', lineHeight: 23 },
  summaryText: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  section: {
    gap: 14,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: COLORS.blueSoft,
  },
  sectionTitle: { flex: 1, color: COLORS.ink, fontSize: 20, fontWeight: '800', lineHeight: 25 },
  sectionContent: { gap: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bullet: {
    width: 6,
    height: 6,
    marginTop: 9,
    borderRadius: 3,
    backgroundColor: COLORS.blue,
  },
  bulletText: { flex: 1, color: COLORS.muted, fontSize: 16, lineHeight: 25 },
  pressed: { opacity: 0.65 },
});

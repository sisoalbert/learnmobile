import { Lucide } from '@react-native-vector-icons/lucide';
import { Image } from 'expo-image';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  blue: '#2289FD',
  blueDark: '#1A6ECE',
  green: '#58CC02',
  greenSoft: '#E8F8D8',
  red: '#E5484D',
  redSoft: '#FFF0F0',
  ink: '#17213B',
  muted: '#737D91',
  border: '#E2E6EC',
  disabled: '#D5D5D5',
  disabledShadow: '#BDBDBD',
  surface: '#FFFFFF',
};

type FormShellProps = PropsWithChildren<{
  navigation?: 'back' | 'close';
  onNavigationPress?: () => void;
  progress?: number;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  legal?: boolean;
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
  centered?: boolean;
}>;

export function CreateProfileShell({
  children,
  navigation,
  onNavigationPress,
  progress,
  primaryLabel,
  primaryDisabled = false,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  legal = false,
  onTermsPress,
  onPrivacyPress,
  centered = false,
}: FormShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.page}>
          {navigation && onNavigationPress && progress !== undefined ? (
            <View style={styles.header}>
              <Pressable
                accessibilityLabel={navigation === 'back' ? 'Go back' : 'Close profile creation'}
                accessibilityRole="button"
                hitSlop={8}
                onPress={onNavigationPress}
                style={({ pressed }) => [styles.navigationButton, pressed && styles.controlPressed]}
              >
                <Lucide name={navigation === 'back' ? 'arrow-left' : 'x'} size={25} color={COLORS.muted} />
              </Pressable>
              <View
                accessibilityLabel={`${Math.round(progress * 100)}% of profile creation complete`}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
                style={styles.progressTrack}
              >
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          ) : (
            <View style={styles.minimalHeader} />
          )}

          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.scrollContent, centered && styles.scrollContentCentered]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View style={styles.footer}>
            {legal && onTermsPress && onPrivacyPress ? (
              <LegalText onTermsPress={onTermsPress} onPrivacyPress={onPrivacyPress} />
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: primaryDisabled }}
              disabled={primaryDisabled}
              onPress={onPrimaryPress}
              style={({ pressed }) => [
                styles.primaryButton,
                primaryDisabled && styles.primaryButtonDisabled,
                pressed && !primaryDisabled && styles.primaryButtonPressed,
              ]}
            >
              <Text selectable style={styles.primaryButtonText}>{primaryLabel}</Text>
            </Pressable>

            {secondaryLabel && onSecondaryPress ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={onSecondaryPress}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.controlPressed]}
              >
                <Text selectable style={styles.secondaryButtonText}>{secondaryLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LegalText({
  onTermsPress,
  onPrivacyPress,
}: {
  onTermsPress: () => void;
  onPrivacyPress: () => void;
}) {
  return (
    <View accessibilityLabel="Legal agreements" style={styles.legalRow}>
      <Text selectable style={styles.legalText}>By continuing, you agree to our</Text>
      <Pressable accessibilityRole="link" onPress={onTermsPress}>
        <Text selectable style={styles.legalLink}>Terms</Text>
      </Pressable>
      <Text selectable style={styles.legalText}>and</Text>
      <Pressable accessibilityRole="link" onPress={onPrivacyPress}>
        <Text selectable style={styles.legalLink}>Privacy Policy</Text>
      </Pressable>
      <Text selectable style={styles.legalText}>.</Text>
    </View>
  );
}

function SpeechBubble({ children }: PropsWithChildren) {
  return (
    <View style={styles.speechBubble}>
      <Text selectable style={styles.speechText}>{children}</Text>
      <View style={styles.speechTailBorder} />
      <View style={styles.speechTail} />
    </View>
  );
}

function Mascot({ happy = false }: { happy?: boolean }) {
  return (
    <Animated.View entering={ZoomIn.duration(260)} style={happy && styles.happyMascotWrap}>
      <Image
        accessibilityLabel={happy ? 'Rex celebrating your new profile' : 'Rex, the Learn Expo guide'}
        contentFit="contain"
        source={require('../../../assets/logo.png')}
        style={[styles.mascot, happy && styles.happyMascot]}
      />
    </Animated.View>
  );
}

function FormContent({ children }: PropsWithChildren) {
  return (
    <Animated.View entering={FadeInUp.duration(260)} style={styles.formContent}>
      {children}
    </Animated.View>
  );
}

function Heading({ children }: PropsWithChildren) {
  return <Text selectable style={styles.heading}>{children}</Text>;
}

type FormFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  secureTextEntry?: boolean;
  editable?: boolean;
  error?: boolean;
  rightAccessory?: ReactNode;
  testID?: string;
};

function FormField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoComplete,
  maxLength,
  secureTextEntry,
  editable = true,
  error = false,
  rightAccessory,
  testID,
}: FormFieldProps) {
  return (
    <View style={[styles.inputShell, error && styles.inputShellError]}>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA2B1"
        secureTextEntry={secureTextEntry}
        style={styles.input}
        testID={testID}
        value={value}
      />
      {rightAccessory}
    </View>
  );
}

export function ProfilePromptScreen() {
  return (
    <FormContent>
      <SpeechBubble>{"Don’t lose your progress! Let’s create a profile."}</SpeechBubble>
      <Mascot />
    </FormContent>
  );
}

export function AgeScreen({ age, onChangeAge, valid }: { age: string; onChangeAge: (age: string) => void; valid: boolean }) {
  return (
    <FormContent>
      <Heading>How old are you?</Heading>
      <FormField
        autoComplete="off"
        keyboardType="number-pad"
        maxLength={3}
        onChangeText={(value) => onChangeAge(value.replace(/\D/g, '').slice(0, 3))}
        placeholder="Age"
        value={age}
        rightAccessory={
          valid ? (
            <View accessibilityLabel="Valid age" style={styles.validIndicator}>
              <Lucide name="check" size={17} color={COLORS.surface} />
            </View>
          ) : null
        }
      />
    </FormContent>
  );
}

export function NameScreen({
  firstName,
  lastName,
  onChangeFirstName,
  onChangeLastName,
}: {
  firstName: string;
  lastName: string;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
}) {
  return (
    <FormContent>
      <Heading>What is your name?</Heading>
      <View style={styles.fieldList}>
        <FormField
          autoCapitalize="words"
          autoComplete="name-given"
          onChangeText={onChangeFirstName}
          placeholder="First name"
          value={firstName}
        />
        <FormField
          autoCapitalize="words"
          autoComplete="name-family"
          onChangeText={onChangeLastName}
          placeholder="Last name"
          value={lastName}
        />
      </View>
    </FormContent>
  );
}

export function EmailScreen({
  fullName,
  email,
  onChangeEmail,
  invalid,
  suggestion,
  onUseSuggestion,
}: {
  fullName: string;
  email: string;
  onChangeEmail: (value: string) => void;
  invalid: boolean;
  suggestion: string;
  onUseSuggestion: () => void;
}) {
  return (
    <FormContent>
      <Heading>What is your email address, {fullName}?</Heading>
      <View style={styles.fieldWithMessage}>
        <FormField
          autoCapitalize="none"
          autoComplete="email"
          error={invalid}
          keyboardType="email-address"
          onChangeText={onChangeEmail}
          placeholder="Email"
          value={email}
          rightAccessory={
            invalid ? (
              <View accessibilityLabel="Invalid email" style={styles.errorIndicator}>
                <Lucide name="x" size={17} color={COLORS.surface} />
              </View>
            ) : null
          }
        />
        {invalid ? (
          <View accessibilityLiveRegion="polite" style={styles.emailErrorContent}>
            <Text selectable style={styles.errorText}>Invalid email address</Text>
            <Pressable
              accessibilityLabel={`Use suggested email ${suggestion}`}
              accessibilityRole="button"
              onPress={onUseSuggestion}
              style={({ pressed }) => pressed && styles.controlPressed}
            >
              <Text selectable style={styles.suggestionText}>Use {suggestion}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </FormContent>
  );
}

export function PasswordScreen({
  password,
  onChangePassword,
  visible,
  onToggleVisibility,
  errorMessage = '',
  isSubmitting = false,
}: {
  password: string;
  onChangePassword: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  errorMessage?: string;
  isSubmitting?: boolean;
}) {
  return (
    <FormContent>
      <Heading>Create a password</Heading>
      <View style={styles.fieldWithMessage}>
        <FormField
          autoCapitalize="none"
          autoComplete="new-password"
          editable={!isSubmitting}
          onChangeText={onChangePassword}
          placeholder="Password"
          secureTextEntry={!visible}
          testID="password-input"
          value={password}
          rightAccessory={
            <Pressable
              accessibilityLabel={visible ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onToggleVisibility}
              style={({ pressed }) => [styles.inputAccessoryButton, pressed && styles.controlPressed]}
            >
              <Lucide name={visible ? 'eye-off' : 'eye'} size={22} color={COLORS.muted} />
            </Pressable>
          }
        />
        <Text selectable style={styles.passwordHint}>Use at least 8 characters.</Text>
        {errorMessage ? (
          <Text accessibilityRole="alert" selectable style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : null}
      </View>
    </FormContent>
  );
}

export function SuccessScreen({ fullName }: { fullName: string }) {
  return (
    <FormContent>
      <SpeechBubble>Welcome, {fullName}! Your profile has been successfully created.</SpeechBubble>
      <Mascot happy />
    </FormContent>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  keyboardAvoidingView: { flex: 1 },
  page: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  minimalHeader: { height: 24 },
  navigationButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  progressTrack: { flex: 1, height: 9, overflow: 'hidden', borderRadius: 999, backgroundColor: '#ECEFF2' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.blue },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 42, paddingBottom: 24 },
  scrollContentCentered: { justifyContent: 'center', paddingTop: 24 },
  footer: { gap: 12, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12, backgroundColor: COLORS.surface },
  primaryButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16, borderCurve: 'continuous', backgroundColor: COLORS.blue, boxShadow: `0 4px 0 ${COLORS.blueDark}` },
  primaryButtonDisabled: { backgroundColor: COLORS.disabled, boxShadow: `0 4px 0 ${COLORS.disabledShadow}` },
  primaryButtonPressed: { transform: [{ translateY: 2 }], opacity: 0.92 },
  primaryButtonText: { color: COLORS.surface, fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
  secondaryButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.blue, fontSize: 16, fontWeight: '800' },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 },
  legalText: { color: COLORS.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  legalLink: { color: COLORS.blue, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  formContent: { width: '100%', alignItems: 'center', gap: 24 },
  heading: { width: '100%', color: COLORS.ink, fontSize: 28, fontWeight: '900', lineHeight: 35, letterSpacing: -0.5, textAlign: 'center' },
  fieldList: { width: '100%', gap: 12 },
  fieldWithMessage: { width: '100%', gap: 10 },
  inputShell: { width: '100%', minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16, borderCurve: 'continuous', backgroundColor: COLORS.surface },
  inputShellError: { borderColor: COLORS.red, backgroundColor: COLORS.redSoft },
  input: { flex: 1, minHeight: 54, color: COLORS.ink, fontSize: 17, fontWeight: '600' },
  inputAccessoryButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  validIndicator: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.green },
  errorIndicator: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.red },
  emailErrorContent: { alignItems: 'flex-start', gap: 7, paddingHorizontal: 4 },
  errorText: { color: COLORS.red, fontSize: 13, fontWeight: '700' },
  suggestionText: { color: COLORS.blue, fontSize: 14, fontWeight: '800' },
  passwordHint: { color: COLORS.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
  speechBubble: { width: '100%', maxWidth: 430, minHeight: 82, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16, borderCurve: 'continuous', backgroundColor: COLORS.surface },
  speechText: { color: COLORS.ink, fontSize: 18, fontWeight: '700', lineHeight: 25, textAlign: 'center' },
  speechTailBorder: { position: 'absolute', bottom: -11, left: '50%', borderLeftWidth: 11, borderRightWidth: 11, borderTopWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: COLORS.border },
  speechTail: { position: 'absolute', bottom: -8, left: '50%', marginLeft: 2, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: COLORS.surface },
  mascot: { width: 165, height: 165 },
  happyMascotWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', borderRadius: 100, backgroundColor: COLORS.greenSoft },
  happyMascot: { width: 176, height: 176 },
  controlPressed: { opacity: 0.65 },
});

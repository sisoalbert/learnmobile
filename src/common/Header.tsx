import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Lucide } from '@react-native-vector-icons/lucide';

import { feedback } from '@/services/feedback';

interface HeaderProps {
  onBack?: () => void;
  showBack?: boolean;
  showSettings?: boolean;
  style?: ViewStyle;
}

export default function Header({
  onBack,
  showBack = true,
  showSettings = false,
  style,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    feedback.play('buttonTap');
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.header, style]}>
      {showBack && (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.headerButton}
          onPress={handleBack}
        >
          <Lucide name="arrow-left" size={24} color="#AFAFAF" />
        </Pressable>
      )}

      {showSettings && (
        <Link href="/settings" asChild>
          <Pressable
            accessibilityLabel="Open profile settings"
            accessibilityRole="button"
            onPress={() => feedback.play('buttonTap')}
            style={StyleSheet.flatten([styles.headerButton, styles.settingsButton])}
          >
            <Lucide name="settings" size={24} color="#AFAFAF" />
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    zIndex: 10,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
  },
  settingsButton: {
    marginLeft: 'auto',
  },
});

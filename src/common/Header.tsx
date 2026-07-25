import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Lucide } from '@react-native-vector-icons/lucide';

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
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={styles.headerButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Lucide name="arrow-left" size={24} color="#AFAFAF" />
        </TouchableOpacity>
      )}

      {showSettings && (
        <Link href="/profile/settings" asChild>
          <TouchableOpacity
            accessibilityLabel="Open profile settings"
            accessibilityRole="button"
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Lucide name="settings" size={24} color="#AFAFAF" />
          </TouchableOpacity>
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
});

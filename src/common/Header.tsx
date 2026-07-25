import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Lucide } from '@react-native-vector-icons/lucide';

interface HeaderProps {
  onBack?: () => void;
  showBack?: boolean;
  style?: ViewStyle;
}

export default function Header({ onBack, showBack = true, style }: HeaderProps) {
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Lucide name="arrow-left" size={24} color="#AFAFAF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
});

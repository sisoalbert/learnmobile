import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { LottieView } from './LottieView';

export function WelcomeAnimation({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LottieView
      source={require('@/assets/animations/welcome.json')}
      autoPlay
      loop
      style={[styles.animation, style]}
    />
  );
}

export default WelcomeAnimation;

const styles = StyleSheet.create({
  animation: {
    width: 280,
    height: 280,
  },
});


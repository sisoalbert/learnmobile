import { StyleSheet } from 'react-native';
import { LottieView } from './LottieView';

export default function WelcomeAnimation() {
  return (
    <LottieView
      source={require('@/assets/animations/welcome.json')}
      autoPlay
      loop
      style={styles.animation}
    />
  );
}

const styles = StyleSheet.create({
  animation: {
    width: 280,
    height: 280,
    marginTop: 24,
  },
});

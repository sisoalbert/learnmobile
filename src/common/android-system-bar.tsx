import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View, type ColorSchemeName } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function getAndroidStatusBarTheme(colorScheme: ColorSchemeName) {
  const isDark = colorScheme === 'dark';
  return {
    backgroundColor: isDark ? '#111827' : '#F8FAFD',
    style: isDark ? 'light' as const : 'dark' as const,
  };
}

export function AndroidSystemBar() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  if (process.env.EXPO_OS !== 'android') return <StatusBar animated style="auto" />;

  const theme = getAndroidStatusBarTheme(colorScheme);

  return (
    <>
      <StatusBar animated style={theme.style} />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.backdrop,
          { height: insets.top, backgroundColor: theme.backgroundColor },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 1000,
  },
});

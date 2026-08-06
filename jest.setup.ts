import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-vector-icons/lucide', () => ({
  Lucide: () => null,
}));

jest.mock('react-native-reanimated', () => {
  const { ScrollView, Text, View } = jest.requireActual('react-native');
  const animation = {
    delay() { return this; },
    duration() { return this; },
    springify() { return this; },
  };

  return {
    __esModule: true,
    default: { ScrollView, Text, View, createAnimatedComponent: (component: unknown) => component },
    BounceIn: animation,
    cancelAnimation: jest.fn(),
    Easing: {
      ease: jest.fn(),
      inOut: () => jest.fn(),
      linear: jest.fn(),
    },
    FadeInUp: animation,
    ZoomIn: animation,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useEvent: () => jest.fn(),
    useReducedMotion: jest.fn(() => false),
    useSharedValue: (value: unknown) => ({ value }),
    withRepeat: jest.fn((value: unknown) => value),
    withSpring: jest.fn((value: unknown) => value),
    withTiming: jest.fn((value: unknown) => value),
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => unknown, ...args: unknown[]) => callback(...args),
}));

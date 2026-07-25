import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-vector-icons/lucide', () => ({
  Lucide: () => null,
}));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (component: unknown) => component },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useEvent: () => jest.fn(),
    useSharedValue: (value: unknown) => ({ value }),
    withSpring: (value: unknown) => value,
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => unknown, ...args: unknown[]) => callback(...args),
}));

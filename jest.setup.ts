import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-vector-icons/lucide', () => ({
  Lucide: () => null,
}));

jest.mock('lottie-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(View, props),
  };
});

jest.mock('expo-audio', () => {
  const players: unknown[] = [];
  return {
    __esModule: true,
    __mockPlayers: players,
    createAudioPlayer: jest.fn(() => {
      const player = {
        pause: jest.fn(),
        play: jest.fn(),
        remove: jest.fn(),
        seekTo: jest.fn(() => Promise.resolve()),
        volume: 1,
      };
      players.push(player);
      return player;
    }),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: {
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  PermissionStatus: { DENIED: 'denied' },
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  clearLastNotificationResponseAsync: jest.fn(() => Promise.resolve()),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExpoPushToken[test]' })),
  getLastNotificationResponse: jest.fn(() => null),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
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

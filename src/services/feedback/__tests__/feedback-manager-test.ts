import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import {
  FeedbackManager,
  INCORRECT_ANSWER_COOLDOWN_MS,
} from '../feedback-manager';
import { useFeedbackPreferencesStore } from '../feedback-preferences-store';
import { HapticManager } from '../haptic-manager';
import type { FeedbackEvent, FeedbackPreferences } from '../feedback.types';

describe('feedback manager', () => {
  const sound = {
    dispose: jest.fn(),
    initialize: jest.fn(() => Promise.resolve()),
    play: jest.fn(() => Promise.resolve()),
  };
  const haptic = { play: jest.fn(() => Promise.resolve()) };
  let now = 1_000;
  let preferences: FeedbackPreferences;
  let manager: FeedbackManager;

  beforeEach(() => {
    jest.clearAllMocks();
    now = 1_000;
    preferences = { soundEffectsEnabled: true, hapticFeedbackEnabled: true };
    manager = new FeedbackManager({
      sounds: sound,
      haptics: haptic,
      getPreferences: () => preferences,
      now: () => now,
    });
  });

  test.each<FeedbackEvent>([
    'buttonTap',
    'optionSelected',
    'commitmentConfirmed',
    'profileCreated',
    'onboardingComplete',
    'rewardEarned',
    'correctAnswer',
    'incorrectAnswer',
    'lessonComplete',
    'streakIncrease',
  ])('routes %s to both enabled channels', (event) => {
    manager.play(event);

    expect(sound.play).toHaveBeenCalledWith(event);
    expect(haptic.play).toHaveBeenCalledWith(event);
  });

  test('respects sound and haptic preferences independently', () => {
    preferences = { soundEffectsEnabled: false, hapticFeedbackEnabled: true };
    manager.play('buttonTap');
    expect(sound.play).not.toHaveBeenCalled();
    expect(haptic.play).toHaveBeenCalledWith('buttonTap');

    jest.clearAllMocks();
    preferences = { soundEffectsEnabled: true, hapticFeedbackEnabled: false };
    manager.play('correctAnswer');
    expect(sound.play).toHaveBeenCalledWith('correctAnswer');
    expect(haptic.play).not.toHaveBeenCalled();
  });

  test('debounces rapid incorrect-answer feedback', () => {
    manager.play('incorrectAnswer');
    now += INCORRECT_ANSWER_COOLDOWN_MS - 1;
    manager.play('incorrectAnswer');
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(haptic.play).toHaveBeenCalledTimes(1);

    now += 1;
    manager.play('incorrectAnswer');
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(haptic.play).toHaveBeenCalledTimes(2);
  });
});

describe('haptic manager', () => {
  const manager = new HapticManager();

  beforeEach(() => jest.clearAllMocks());

  test('maps semantic events to gentle native patterns', async () => {
    await manager.play('buttonTap');
    await manager.play('optionSelected');
    await manager.play('commitmentConfirmed');
    await manager.play('profileCreated');
    await manager.play('onboardingComplete');
    await manager.play('rewardEarned');
    await manager.play('correctAnswer');
    await manager.play('incorrectAnswer');
    await manager.play('lessonComplete');
    await manager.play('streakIncrease');

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(
      1,
      Haptics.NotificationFeedbackType.Success,
    );
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(
      2,
      Haptics.NotificationFeedbackType.Success,
    );
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(
      3,
      Haptics.NotificationFeedbackType.Success,
    );
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(
      4,
      Haptics.NotificationFeedbackType.Success,
    );
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(
      5,
      Haptics.NotificationFeedbackType.Error,
    );
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(
      6,
      Haptics.NotificationFeedbackType.Success,
    );
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(
      1,
      Haptics.ImpactFeedbackStyle.Medium,
    );
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(
      2,
      Haptics.ImpactFeedbackStyle.Medium,
    );
  });
});

describe('feedback preferences', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useFeedbackPreferencesStore.setState({
      soundEffectsEnabled: true,
      hapticFeedbackEnabled: true,
    });
  });

  test('persists sound and haptic settings independently', async () => {
    useFeedbackPreferencesStore.getState().setSoundEffectsEnabled(false);
    useFeedbackPreferencesStore.getState().setHapticFeedbackEnabled(true);

    const persisted = await AsyncStorage.getItem('learn-expo:feedback-preferences');
    expect(persisted).toContain('"soundEffectsEnabled":false');
    expect(persisted).toContain('"hapticFeedbackEnabled":true');
  });
});

import * as Haptics from 'expo-haptics';

import type { FeedbackEvent } from './feedback.types';

export class HapticManager {
  play(event: FeedbackEvent): Promise<void> {
    switch (event) {
      case 'buttonTap':
      case 'optionSelected':
        return Haptics.selectionAsync();
      case 'commitmentConfirmed':
      case 'profileCreated':
      case 'onboardingComplete':
      case 'correctAnswer':
      case 'lessonComplete':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'incorrectAnswer':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      case 'rewardEarned':
      case 'streakIncrease':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
}

export const hapticManager = new HapticManager();

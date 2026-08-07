export type FeedbackEvent =
  | 'buttonTap'
  | 'optionSelected'
  | 'commitmentConfirmed'
  | 'profileCreated'
  | 'onboardingComplete'
  | 'rewardEarned'
  | 'correctAnswer'
  | 'incorrectAnswer'
  | 'lessonComplete'
  | 'streakIncrease';

export type FeedbackPreferences = {
  soundEffectsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
};

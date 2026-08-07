import { useFeedbackPreferencesStore } from './feedback-preferences-store';
import type { FeedbackEvent, FeedbackPreferences } from './feedback.types';
import { hapticManager, type HapticManager } from './haptic-manager';
import { soundManager, type SoundManager } from './sound-manager';

const INCORRECT_ANSWER_COOLDOWN_MS = 750;

type FeedbackManagerDependencies = {
  sounds: Pick<SoundManager, 'initialize' | 'play' | 'dispose'>;
  haptics: Pick<HapticManager, 'play'>;
  getPreferences: () => FeedbackPreferences;
  now: () => number;
};

function reportFeedbackError(error: unknown) {
  if (__DEV__) console.warn('Feedback unavailable', error);
}

export class FeedbackManager {
  private lastIncorrectAnswerAt = Number.NEGATIVE_INFINITY;

  constructor(private dependencies: FeedbackManagerDependencies) {}

  initialize() {
    void this.dependencies.sounds.initialize().catch(reportFeedbackError);
  }

  dispose() {
    this.dependencies.sounds.dispose();
  }

  play(event: FeedbackEvent): void {
    const now = this.dependencies.now();
    if (
      event === 'incorrectAnswer' &&
      now - this.lastIncorrectAnswerAt < INCORRECT_ANSWER_COOLDOWN_MS
    ) {
      return;
    }
    if (event === 'incorrectAnswer') this.lastIncorrectAnswerAt = now;

    const preferences = this.dependencies.getPreferences();
    if (preferences.soundEffectsEnabled) {
      void this.dependencies.sounds.play(event).catch(reportFeedbackError);
    }
    if (preferences.hapticFeedbackEnabled) {
      void this.dependencies.haptics.play(event).catch(reportFeedbackError);
    }
  }
}

export const feedback = new FeedbackManager({
  sounds: soundManager,
  haptics: hapticManager,
  getPreferences: () => {
    const preferences = useFeedbackPreferencesStore.getState();
    return preferences.hasHydrated
      ? preferences
      : { soundEffectsEnabled: false, hapticFeedbackEnabled: false };
  },
  now: Date.now,
});

export { INCORRECT_ANSWER_COOLDOWN_MS };

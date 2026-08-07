import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';

import type { FeedbackEvent } from './feedback.types';

const SOUND_SOURCES: Record<FeedbackEvent, AudioSource> = {
  buttonTap: require('../../../assets/sounds/ui-tap.mp3'),
  optionSelected: require('../../../assets/sounds/ui-tap2.mp3'),
  commitmentConfirmed: require('../../../assets/sounds/answer-correct.mp3'),
  profileCreated: require('../../../assets/sounds/answer-correct.mp3'),
  onboardingComplete: require('../../../assets/sounds/reward-earned.mp3'),
  rewardEarned: require('../../../assets/sounds/reward-earned.mp3'),
  correctAnswer: require('../../../assets/sounds/answer-correct.mp3'),
  incorrectAnswer: require('../../../assets/sounds/answer-incorrect.mp3'),
  lessonComplete: require('../../../assets/sounds/lesson-complete.mp3'),
  streakIncrease: require('../../../assets/sounds/streakIncrease.mp3'),
};

const SOUND_VOLUMES: Record<FeedbackEvent, number> = {
  buttonTap: 0.18,
  optionSelected: 0.22,
  commitmentConfirmed: 0.38,
  profileCreated: 0.58,
  onboardingComplete: 0.48,
  rewardEarned: 0.55,
  correctAnswer: 0.55,
  incorrectAnswer: 0.4,
  lessonComplete: 0.65,
  streakIncrease: 0.55,
};

const MILESTONE_EVENTS = new Set<FeedbackEvent>([
  'commitmentConfirmed',
  'profileCreated',
  'onboardingComplete',
  'rewardEarned',
  'lessonComplete',
  'streakIncrease',
]);

export class SoundManager {
  private players = new Map<FeedbackEvent, AudioPlayer>();
  private initializePromise: Promise<void> | null = null;
  private lifecycleGeneration = 0;

  initialize(): Promise<void> {
    if (this.initializePromise) return this.initializePromise;

    const generation = ++this.lifecycleGeneration;
    this.initializePromise = this.initializePlayers(generation).catch((error) => {
      this.dispose();
      throw error;
    });
    return this.initializePromise;
  }

  private async initializePlayers(generation: number) {
    await setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    if (generation !== this.lifecycleGeneration) return;

    for (const event of Object.keys(SOUND_SOURCES) as FeedbackEvent[]) {
      const player = createAudioPlayer(SOUND_SOURCES[event], {
        downloadFirst: true,
        keepAudioSessionActive: false,
      });
      player.volume = SOUND_VOLUMES[event];
      this.players.set(event, player);
    }
  }

  async play(event: FeedbackEvent) {
    await this.initialize();
    if (MILESTONE_EVENTS.has(event)) this.stopAll();

    const player = this.players.get(event);
    if (!player) return;

    player.pause();
    await player.seekTo(0);
    player.play();
  }

  stopAll() {
    for (const player of this.players.values()) {
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    }
  }

  dispose() {
    this.lifecycleGeneration += 1;
    for (const player of this.players.values()) player.remove();
    this.players.clear();
    this.initializePromise = null;
  }
}

export const soundManager = new SoundManager();

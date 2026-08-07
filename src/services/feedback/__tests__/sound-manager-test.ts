import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { SoundManager } from '../sound-manager';

type MockPlayer = {
  pause: jest.Mock;
  play: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  volume: number;
};

describe('sound manager', () => {
  const audioMock = jest.requireMock('expo-audio') as { __mockPlayers: MockPlayer[] };

  beforeEach(() => {
    jest.clearAllMocks();
    audioMock.__mockPlayers.splice(0);
  });

  test('creates one configured player per semantic event', async () => {
    const manager = new SoundManager();
    await manager.initialize();

    expect(setAudioModeAsync).toHaveBeenCalledWith({
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    expect(createAudioPlayer).toHaveBeenCalledTimes(10);
    expect(audioMock.__mockPlayers.map((player) => player.volume)).toEqual([
      0.18,
      0.22,
      0.38,
      0.58,
      0.48,
      0.55,
      0.55,
      0.4,
      0.65,
      0.55,
    ]);
  });

  test('restarts sounds and makes milestone playback exclusive', async () => {
    const manager = new SoundManager();
    await manager.initialize();
    await manager.play('buttonTap');

    expect(audioMock.__mockPlayers[0].pause).toHaveBeenCalledTimes(1);
    expect(audioMock.__mockPlayers[0].seekTo).toHaveBeenCalledWith(0);
    expect(audioMock.__mockPlayers[0].play).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    await manager.play('lessonComplete');
    expect(audioMock.__mockPlayers.every((player) => player.pause.mock.calls.length > 0)).toBe(true);
    expect(audioMock.__mockPlayers[8].play).toHaveBeenCalledTimes(1);
  });

  test('releases every player on disposal', async () => {
    const manager = new SoundManager();
    await manager.initialize();
    manager.dispose();

    expect(audioMock.__mockPlayers.every((player) => player.remove.mock.calls.length === 1)).toBe(true);
  });
});

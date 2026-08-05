import { applyLessonQuestProgress, mergeQuestProgress } from '../reward-progress';

describe('lesson reward progress', () => {
  test('counts every completed attempt and qualifies scores at exactly 80 percent', () => {
    const first = applyLessonQuestProgress(
      { questPoints: 0, lessonsCompleted: 0, highAccuracyLessons: 0, streakExtensions: 0 },
      { questPoints: 1, accuracyPercent: 80, firstLessonToday: true },
    );
    const repeated = applyLessonQuestProgress(first, {
      questPoints: 1,
      accuracyPercent: 79,
      firstLessonToday: false,
    });

    expect(repeated).toEqual({
      questPoints: 2,
      lessonsCompleted: 2,
      highAccuracyLessons: 1,
      streakExtensions: 1,
    });
  });

  test('combines guest and authenticated monthly counters', () => {
    expect(mergeQuestProgress(
      { questPoints: 4, lessonsCompleted: 4, highAccuracyLessons: 3, streakExtensions: 2 },
      { questPoints: 2, lessonsCompleted: 2, highAccuracyLessons: 1, streakExtensions: 1 },
    )).toEqual({
      questPoints: 6,
      lessonsCompleted: 6,
      highAccuracyLessons: 4,
      streakExtensions: 3,
    });
  });
});

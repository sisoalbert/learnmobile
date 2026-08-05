export type QuestCounters = {
  questPoints: number;
  lessonsCompleted: number;
  highAccuracyLessons: number;
  streakExtensions: number;
};

export function applyLessonQuestProgress(
  current: QuestCounters,
  input: { questPoints: number; accuracyPercent: number; firstLessonToday: boolean },
): QuestCounters {
  return {
    questPoints: current.questPoints + input.questPoints,
    lessonsCompleted: current.lessonsCompleted + 1,
    highAccuracyLessons: current.highAccuracyLessons + (input.accuracyPercent >= 80 ? 1 : 0),
    streakExtensions: current.streakExtensions + (input.firstLessonToday ? 1 : 0),
  };
}

export function mergeQuestProgress(left: QuestCounters, right: QuestCounters): QuestCounters {
  return {
    questPoints: left.questPoints + right.questPoints,
    lessonsCompleted: left.lessonsCompleted + right.lessonsCompleted,
    highAccuracyLessons: left.highAccuracyLessons + right.highAccuracyLessons,
    streakExtensions: left.streakExtensions + right.streakExtensions,
  };
}

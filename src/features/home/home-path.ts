export type PublishedCourse = {
  key: string;
  title: string;
  order: number;
};

export type CourseProgress = {
  courseKey: string | null;
  currentLessonKey: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  totalXp: number;
  hearts: number;
  completedLessons: number;
};

export type PathLesson = {
  key: string;
  title: string;
  description?: string;
  order: number;
  xpReward: number;
};

export type PathUnit = {
  key: string;
  title: string;
  order: number;
  lessons: PathLesson[];
};

export type CoursePath = {
  key: string;
  title: string;
  description: string;
  units: PathUnit[];
};

export type LessonNode = PathLesson & {
  position: number;
  state: 'completed' | 'current' | 'locked';
};

export function selectCurrentCourse(
  courses: PublishedCourse[],
  progress: CourseProgress[],
): PublishedCourse | undefined {
  const ordered = [...courses].sort((left, right) => left.order - right.order);
  const progressByCourse = new Map(progress.map((item) => [item.courseKey, item]));
  return ordered.find((course) => progressByCourse.get(course.key)?.status === 'in_progress')
    ?? ordered.find((course) => progressByCourse.get(course.key)?.status !== 'completed')
    ?? ordered.at(-1);
}

export function selectCurrentUnit(
  course: CoursePath,
  progress?: CourseProgress,
): PathUnit | undefined {
  const units = [...course.units].sort((left, right) => left.order - right.order);
  if (!units.length) return undefined;

  const currentLessonKey = progress?.currentLessonKey;
  if (currentLessonKey) {
    const currentUnit = units.find((unit) => unit.lessons.some((lesson) => lesson.key === currentLessonKey));
    if (currentUnit) return currentUnit;
  }

  const completedLessons = progress?.completedLessons ?? 0;
  let position = 0;
  for (const unit of units) {
    const unitEnd = position + unit.lessons.length;
    if (completedLessons < unitEnd) return unit;
    position = unitEnd;
  }
  return units.at(-1);
}

export function createLessonNodes(
  course: CoursePath,
  unit: PathUnit,
  progress?: CourseProgress,
): LessonNode[] {
  const orderedUnits = [...course.units].sort((left, right) => left.order - right.order);
  const unitOffset = orderedUnits
    .filter((item) => item.order < unit.order)
    .reduce((total, item) => total + item.lessons.length, 0);
  const completedLessons = progress?.completedLessons ?? 0;

  return [...unit.lessons]
    .sort((left, right) => left.order - right.order)
    .map((lesson, index) => {
      const position = unitOffset + index;
      return {
        ...lesson,
        position,
        state: position < completedLessons
          ? 'completed'
          : position === completedLessons
            ? 'current'
            : 'locked',
      };
    });
}

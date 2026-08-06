import {
  createLessonNodes,
  selectCurrentCourse,
  selectCurrentUnit,
  type CoursePath,
  type CourseProgress,
  type PublishedCourse,
} from '../home-path';

const courses: PublishedCourse[] = [
  { key: 'course-1', title: 'One', order: 0 },
  { key: 'course-2', title: 'Two', order: 1 },
  { key: 'course-3', title: 'Three', order: 2 },
];

function progress(
  courseKey: string,
  status: CourseProgress['status'],
  completedLessons = 0,
  currentLessonKey: string | null = null,
): CourseProgress {
  return { courseKey, status, completedLessons, currentLessonKey, totalXp: 0, hearts: 5 };
}

const coursePath: CoursePath = {
  key: 'course-1',
  title: 'Course One',
  description: 'Course description',
  units: [
    {
      key: 'unit-1',
      title: 'First unit',
      order: 0,
      lessons: [
        { key: 'lesson-1', title: 'One', order: 0, xpReward: 10 },
        { key: 'lesson-2', title: 'Two', order: 1, xpReward: 20 },
      ],
    },
    {
      key: 'unit-2',
      title: 'Second unit',
      order: 1,
      lessons: [
        { key: 'lesson-3', title: 'Three', order: 0, xpReward: 30 },
        { key: 'lesson-4', title: 'Four', order: 1, xpReward: 40 },
      ],
    },
  ],
};

describe('Home lesson-path selection', () => {
  test('starts a new learner on the first published course', () => {
    expect(selectCurrentCourse(courses, [])?.key).toBe('course-1');
  });

  test('prefers the first in-progress course', () => {
    expect(selectCurrentCourse(courses, [
      progress('course-1', 'completed', 2),
      progress('course-2', 'in_progress', 1, 'course-2-lesson-2'),
    ])?.key).toBe('course-2');
  });

  test('advances to the first incomplete course and finishes on the final course', () => {
    expect(selectCurrentCourse(courses, [progress('course-1', 'completed', 2)])?.key).toBe('course-2');
    expect(selectCurrentCourse(courses, courses.map((course) => progress(course.key, 'completed', 2)))?.key).toBe('course-3');
  });

  test('selects the unit containing the current lesson', () => {
    expect(selectCurrentUnit(coursePath, progress('course-1', 'in_progress', 2, 'lesson-3'))?.key).toBe('unit-2');
  });

  test('falls forward to the first incomplete unit and then the last unit', () => {
    expect(selectCurrentUnit(coursePath, progress('course-1', 'in_progress', 2))?.key).toBe('unit-2');
    expect(selectCurrentUnit(coursePath, progress('course-1', 'completed', 4))?.key).toBe('unit-2');
  });

  test('derives completed, current, and locked nodes using global lesson order', () => {
    const unit = coursePath.units[1];
    expect(createLessonNodes(coursePath, unit, progress('course-1', 'in_progress', 3, 'lesson-4')))
      .toEqual([
        expect.objectContaining({ key: 'lesson-3', position: 2, state: 'completed' }),
        expect.objectContaining({ key: 'lesson-4', position: 3, state: 'current' }),
      ]);
  });
});

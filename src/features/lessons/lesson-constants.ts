export const FIRST_LESSON_KEY = 'beginner-course-1-lesson-1';

export function isFirstLesson(lessonKey: string | null | undefined) {
  return lessonKey === FIRST_LESSON_KEY;
}

import { BackendLessonScreen } from './backend-lesson-screen';
import { FIRST_LESSON_KEY } from './lesson-constants';

export default function FirstLessonScreen() {
  return <BackendLessonScreen lessonKey={FIRST_LESSON_KEY} />;
}

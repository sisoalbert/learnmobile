import { useLocalSearchParams } from 'expo-router';

import { BackendLessonScreen } from '@/features/lessons/backend-lesson-screen';

export default function LessonRoute() {
  const { lessonKey } = useLocalSearchParams<{ lessonKey: string }>();
  return <BackendLessonScreen lessonKey={lessonKey} />;
}

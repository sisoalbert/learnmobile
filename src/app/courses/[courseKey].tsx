import { useLocalSearchParams } from 'expo-router';

import { CourseScreen } from '@/features/courses/course-screen';

export default function CourseRoute() {
  const { courseKey } = useLocalSearchParams<{ courseKey: string }>();
  return <CourseScreen courseKey={courseKey} />;
}

import { Redirect, useLocalSearchParams } from 'expo-router';

import {
  ComingSoonPathScreen,
  LEARNING_PATHS_BY_LEVEL,
  isLearningPathLevel,
} from '@/features/learning-paths';

export default function LearningPathRoute() {
  const { level } = useLocalSearchParams<{ level: string }>();

  if (!isLearningPathLevel(level)) {
    return <Redirect href="/home" />;
  }

  const path = LEARNING_PATHS_BY_LEVEL[level];
  if (path.status !== 'coming_soon') {
    return <Redirect href="/home" />;
  }

  return <ComingSoonPathScreen path={path} />;
}

import { useLocalSearchParams } from 'expo-router';

import { QuestionSampleScreen } from '@/features/questions';

export default function QuestionTypeRoute() {
  const { type } = useLocalSearchParams<{ type: string }>();
  return <QuestionSampleScreen type={type} />;
}

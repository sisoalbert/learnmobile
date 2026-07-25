import { router } from 'expo-router';

type QuestionRouter = Pick<typeof router, 'back' | 'canGoBack' | 'replace'>;

export function goBackOrReplace(
  fallback: '/home' | '/question-types',
  navigation: QuestionRouter = router,
): void {
  if (navigation.canGoBack()) {
    navigation.back();
    return;
  }

  navigation.replace(fallback);
}

import { type Href, router } from 'expo-router';

type AppRouter = Pick<typeof router, 'back' | 'canGoBack' | 'replace'>;

export function goBackOrReplace(fallback: Href, navigation: AppRouter = router): void {
  if (navigation.canGoBack()) {
    navigation.back();
    return;
  }

  navigation.replace(fallback);
}

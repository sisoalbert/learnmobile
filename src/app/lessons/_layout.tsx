import Stack from 'expo-router/stack';

export default function LessonsLayout() {
  return (
    <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
      <Stack.Screen name="first" />
      <Stack.Screen name="[lessonKey]" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="results" />
      <Stack.Screen name="ad" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="streak-increase" />
      <Stack.Screen name="streak-details" />
      <Stack.Screen name="monthly-quest" />
      <Stack.Screen name="reward" />
    </Stack>
  );
}

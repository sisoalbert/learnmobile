import Stack from 'expo-router/stack';

export default function LessonsLayout() {
  return (
    <Stack screenOptions={{ animation: 'fade', headerShown: false }}>
      <Stack.Screen name="first" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="results" />
    </Stack>
  );
}

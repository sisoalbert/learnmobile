import { Lucide } from '@react-native-vector-icons/lucide';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { goBackOrReplace } from '@/navigation/go-back-or-replace';

export default function LegalPlaceholderScreen({ title }: { title: string }) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => goBackOrReplace('/create-profile' as never, router)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Lucide name="arrow-left" size={25} color="#737D91" />
          </Pressable>
        </View>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text selectable style={styles.title}>{title}</Text>
          <Text selectable style={styles.body}>
            {title} content will be added here. This placeholder keeps the profile-creation flow connected while the final legal copy is prepared.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  page: { flex: 1, width: '100%', maxWidth: 700, alignSelf: 'center' },
  header: { minHeight: 58, justifyContent: 'center', paddingHorizontal: 18 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  content: { flexGrow: 1, gap: 18, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  title: { color: '#17213B', fontSize: 32, fontWeight: '900', letterSpacing: -0.6 },
  body: { maxWidth: 560, color: '#737D91', fontSize: 16, lineHeight: 24 },
  pressed: { opacity: 0.65 },
});

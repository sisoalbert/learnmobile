import { Lucide } from '@react-native-vector-icons/lucide';
import { useQuery } from 'convex/react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { goBackOrReplace } from '@/navigation/go-back-or-replace';

const isConvexConfigured = Boolean(process.env.EXPO_PUBLIC_CONVEX_URL);

export default function TodoRoute() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => goBackOrReplace('/home')}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Lucide name="arrow-left" size={22} color="#17213B" />
          </Pressable>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text selectable style={styles.liveText}>LIVE DATA</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <View style={styles.icon}>
            <Lucide name="list-checks" size={30} color="#1E73D1" />
          </View>
          <Text selectable style={styles.eyebrow}>CONVEX QUICKSTART</Text>
          <Text selectable style={styles.title}>Things to do</Text>
          <Text selectable style={styles.subtitle}>
            This list is queried from the tasks table and updates automatically when the Convex data changes.
          </Text>
        </View>

        {isConvexConfigured ? <TodoList /> : <MissingConfiguration />}
      </ScrollView>
    </SafeAreaView>
  );
}

function TodoList() {
  const tasks = useQuery(api.tasks.get);

  if (tasks === undefined) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.stateCard}>
        <ActivityIndicator color="#1E73D1" size="small" />
        <Text selectable style={styles.stateTitle}>Loading tasks</Text>
        <Text selectable style={styles.stateText}>Connecting to your Convex deployment…</Text>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.stateCard}>
        <Lucide name="inbox" size={28} color="#7C879C" />
        <Text selectable style={styles.stateTitle}>No tasks yet</Text>
        <Text selectable style={styles.stateText}>Import sampleData.jsonl to populate the tasks table.</Text>
      </View>
    );
  }

  const completedCount = tasks.filter((task) => task.isCompleted).length;

  return (
    <View style={styles.listCard}>
      <View style={styles.listHeader}>
        <Text selectable style={styles.listTitle}>Today</Text>
        <Text selectable style={styles.progressText}>{completedCount} of {tasks.length} complete</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${tasks.length === 0 ? 0 : (completedCount / tasks.length) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.taskList}>
        {tasks.map((task) => (
          <View key={task._id} style={styles.taskRow}>
            <Lucide
              name={task.isCompleted ? 'circle-check' : 'circle'}
              size={25}
              color={task.isCompleted ? '#178E43' : '#A1A9B8'}
            />
            <Text
              selectable
              style={[styles.taskText, task.isCompleted && styles.completedTaskText]}
            >
              {task.text}
            </Text>
            <View style={[styles.statusPill, task.isCompleted && styles.completedPill]}>
              <Text
                selectable
                style={[styles.statusText, task.isCompleted && styles.completedStatusText]}
              >
                {task.isCompleted ? 'DONE' : 'OPEN'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function MissingConfiguration() {
  return (
    <View style={styles.stateCard}>
      <Lucide name="cloud-off" size={28} color="#D46B08" />
      <Text selectable style={styles.stateTitle}>Convex isn’t configured</Text>
      <Text selectable style={styles.stateText}>
        Run npx convex dev, then restart Expo so EXPO_PUBLIC_CONVEX_URL is loaded.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  content: {
    width: '100%',
    maxWidth: 720,
    minHeight: '100%',
    alignSelf: 'center',
    gap: 26,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 12px rgba(23, 33, 59, 0.08)',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E9F8EF',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#178E43' },
  liveText: { color: '#178E43', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  intro: { alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  icon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#EAF4FF',
  },
  eyebrow: { color: '#1E73D1', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#17213B', fontSize: 34, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: {
    maxWidth: 520,
    color: '#737D91',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  listCard: {
    gap: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 30px rgba(23, 33, 59, 0.07)',
  },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  listTitle: { color: '#27324B', fontSize: 20, fontWeight: '900' },
  progressText: { color: '#7C879C', fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: '#E8EBF0' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#178E43' },
  taskList: { gap: 10 },
  taskRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8EBF0',
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#FAFBFC',
  },
  taskText: { flex: 1, color: '#27324B', fontSize: 15, fontWeight: '700' },
  completedTaskText: { color: '#788296', textDecorationLine: 'line-through' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#F0F2F5' },
  completedPill: { backgroundColor: '#E9F8EF' },
  statusText: { color: '#7C879C', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  completedStatusText: { color: '#178E43' },
  stateCard: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  stateTitle: { color: '#27324B', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  stateText: { maxWidth: 430, color: '#7C879C', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});

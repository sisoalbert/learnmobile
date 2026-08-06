import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { StyleSheet, Text, View } from 'react-native';

export function QuestProgressCard({
  color,
  icon,
  label,
  target,
  value,
}: {
  color: string;
  icon: LucideIconName;
  label: string;
  target: number;
  value: number;
}) {
  const progress = Math.min(1, value / Math.max(1, target));

  return (
    <View
      accessibilityLabel={`${label}, ${value} of ${target}`}
      style={styles.card}
    >
      <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
        <Lucide color={color} name={icon} size={24} />
      </View>
      <View style={styles.copy}>
        <View style={styles.labels}>
          <Text selectable style={styles.label}>{label}</Text>
          <Text selectable style={[styles.value, { color }]}>{value} / {target}</Text>
        </View>
        <View
          accessibilityLabel={`${label} progress`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: target, now: Math.min(value, target) }}
          style={styles.track}
        >
          <View style={[styles.fill, { backgroundColor: color, width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1, borderColor: '#E1E6EE', borderRadius: 20, borderCurve: 'continuous', backgroundColor: '#FFFFFF' },
  icon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderCurve: 'continuous' },
  copy: { flex: 1, gap: 10 },
  labels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { flex: 1, color: '#344054', fontSize: 15, fontWeight: '800' },
  value: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  track: { height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: '#E9EDF3' },
  fill: { height: '100%', borderRadius: 999 },
});

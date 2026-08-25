import { Lucide } from '@react-native-vector-icons/lucide';
import * as Sentry from '@sentry/react-native';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/common';
import { feedback } from '@/services/feedback';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type Device = {
  id: Id<'devices'>;
  platform: 'ios' | 'android';
  createdAt: number;
  lastSeenAt: number;
};

const formatDate = (timestamp: number) => new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date(timestamp));

export default function DevicesSettingsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const devices = useQuery(api.notifications.listDevices, isAuthenticated ? {} : 'skip');
  const removeDevice = useMutation(api.notifications.removeDevice);
  const [removingDeviceId, setRemovingDeviceId] = useState<Id<'devices'> | null>(null);

  const confirmRemoval = (device: Device) => {
    feedback.play('buttonTap');
    Alert.alert(
      'Remove device?',
      'This device will no longer receive push notifications. To add it again, turn Practice reminders off and back on from that device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove device',
          style: 'destructive',
          onPress: () => void handleRemoval(device.id),
        },
      ],
    );
  };

  const handleRemoval = async (deviceId: Id<'devices'>) => {
    if (removingDeviceId) return;
    setRemovingDeviceId(deviceId);
    try {
      await removeDevice({ deviceId });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { area: 'notifications', operation: 'remove_device' },
      });
      Alert.alert('Unable to remove device', 'Please check your connection and try again.');
    } finally {
      setRemovingDeviceId(null);
    }
  };

  const isLoading = isAuthenticated && devices === undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header onBack={() => router.replace('/settings')} />
      <FlatList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={(devices ?? []) as Device[]}
        keyExtractor={(device) => device.id}
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text selectable style={styles.title}>Devices</Text>
            <Text selectable style={styles.description}>
              These devices can receive your Learn Expo push notifications.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Lucide name="bell-off" size={26} color="#737373" />
            <Text selectable style={styles.emptyTitle}>
              {isLoading ? 'Loading devices…' : 'No devices receiving notifications'}
            </Text>
            {!isLoading ? (
              <Text selectable style={styles.emptyDescription}>
                Turn Practice reminders off and back on from the device to add it here.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const isRemoving = removingDeviceId === item.id;
          const platformLabel = item.platform === 'ios' ? 'iPhone or iPad' : 'Android device';
          return (
            <View style={styles.deviceCard}>
              <View style={styles.deviceIcon}>
                <Lucide name={item.platform === 'ios' ? 'smartphone' : 'tablet-smartphone'} size={22} color="#1899D6" />
              </View>
              <View style={styles.deviceCopy}>
                <Text selectable style={styles.deviceName}>{platformLabel}</Text>
                <Text selectable style={styles.deviceMetadata}>
                  Last active {formatDate(item.lastSeenAt)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Remove ${platformLabel}`}
                accessibilityRole="button"
                disabled={isRemoving || removingDeviceId !== null}
                hitSlop={8}
                onPress={() => confirmRemoval(item)}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && !isRemoving && styles.removeButtonPressed,
                  isRemoving && styles.removeButtonDisabled,
                ]}
              >
                <Text style={styles.removeButtonText}>{isRemoving ? 'Removing…' : 'Remove'}</Text>
              </Pressable>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  heading: { gap: 6, paddingBottom: 24 },
  title: { color: '#2D2D2D', fontSize: 28, fontWeight: '800' },
  description: { color: '#737373', fontSize: 15, lineHeight: 21 },
  deviceCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E2E2',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  deviceIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#F2FAFF',
  },
  deviceCopy: { flex: 1, gap: 4 },
  deviceName: { color: '#2D2D2D', fontSize: 16, fontWeight: '800' },
  deviceMetadata: { color: '#737373', fontSize: 13 },
  removeButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D64545',
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FFF7F7',
  },
  removeButtonPressed: { opacity: 0.68 },
  removeButtonDisabled: { opacity: 0.55 },
  removeButtonText: { color: '#D64545', fontSize: 13, fontWeight: '800' },
  separator: { height: 10 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: '#2D2D2D', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { color: '#737373', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});

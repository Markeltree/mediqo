import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/lib/api';
import { FadeInView } from '../src/components/FadeInView';
import { CardSkeleton, EmptyState, Text } from '../src/components/ui';
import { colors, radius, shadow, spacing } from '../src/theme';
import type { AppNotification } from '../src/lib/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function iconFor(n: AppNotification): { name: IconName; fg: string; bg: string } {
  const t = n.title.toLowerCase();
  if (t.includes('cancel') || t.includes('needs changes')) return { name: 'close-circle', fg: colors.danger, bg: colors.dangerSoft };
  if (t.includes('confirm') || t.includes('live') || t.includes('completed')) return { name: 'checkmark-circle', fg: colors.success, bg: colors.successSoft };
  if (t.includes('request') || t.includes('soon') || t.includes('upcoming')) return { name: 'time', fg: colors.warning, bg: colors.warningSoft };
  return { name: 'notifications', fg: colors.primary, bg: colors.primarySoft };
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/notifications');
    setItems(data.notifications);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setItems([]));
    }, [load])
  );

  const unread = items?.filter((n) => !n.read).length ?? 0;

  const markAll = async () => {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? list);
    await api.post('/notifications/read-all').catch(() => undefined);
  };

  const open = (n: AppNotification) => {
    if (!n.read) {
      setItems((list) => list?.map((x) => (x._id === n._id ? { ...x, read: true } : x)) ?? list);
      api.post(`/notifications/${n._id}/read`).catch(() => undefined);
    }
    if (n.data?.type === 'appointment') router.push('/(tabs)/appointments');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Notifications</Text>
          <Text variant="small" color={colors.muted}>{unread > 0 ? `${unread} unread` : 'You are all caught up'}</Text>
        </View>
        {unread > 0 && (
          <Pressable onPress={markAll} style={styles.markAll} hitSlop={8}>
            <Ionicons name="checkmark-done" size={16} color={colors.primaryDark} />
            <Text variant="label" color={colors.primaryDark}>Read all</Text>
          </Pressable>
        )}
      </View>

      {items === null ? (
        <View style={{ padding: spacing.md }}>{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load().catch(() => undefined); setRefreshing(false); }} />}
          ListEmptyComponent={
            <EmptyState icon="notifications-off-outline" title="No notifications yet" message="Booking requests, confirmations and reminders will show up here." />
          }
          renderItem={({ item, index }) => {
            const ic = iconFor(item);
            return (
              <FadeInView delay={Math.min(index * 40, 240)}>
                <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.card, !item.read && styles.unread, pressed && { opacity: 0.9 }]}>
                  <View style={[styles.icon, { backgroundColor: ic.bg }]}>
                    <Ionicons name={ic.name} size={20} color={ic.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>{item.title}</Text>
                      <Text variant="caption" color={colors.faint}>{timeAgo(item.createdAt)}</Text>
                    </View>
                    <Text variant="small" color={colors.inkSoft} style={{ marginTop: 2 }}>{item.body}</Text>
                  </View>
                  {!item.read && <View style={styles.dot} />}
                </Pressable>
              </FadeInView>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: 'transparent', ...shadow },
  unread: { borderColor: colors.primarySoft, backgroundColor: '#FBFEFE' },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});

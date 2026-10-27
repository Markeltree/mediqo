import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { FadeInView } from '../../src/components/FadeInView';
import { Button } from '../../src/components/Button';
import { CardSkeleton, EmptyState, Segmented, Text, feedback } from '../../src/components/ui';
import { colors, radius, shadow, spacing } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import type { Appointment, AppointmentAction } from '../../src/lib/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS: Record<Appointment['status'], { label: string; fg: string; bg: string; icon: IconName }> = {
  pending: { label: 'Pending', fg: colors.warning, bg: colors.warningSoft, icon: 'time' },
  confirmed: { label: 'Confirmed', fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' },
  completed: { label: 'Completed', fg: colors.muted, bg: colors.surfaceAlt, icon: 'checkmark-done' },
  cancelled: { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSoft, icon: 'close-circle' },
};

const ACTION_STATUS: Record<AppointmentAction, Appointment['status']> = { confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' };
const ACTION_LABEL: Record<AppointmentAction, string> = { confirm: 'Confirm', complete: 'Mark done', cancel: 'Cancel' };

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDoctor = user?.role === 'doctor';
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/appointments', { params: { scope } });
    setItems(data.appointments);
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setItems((list) => list ?? []));
    }, [load])
  );

  const changeScope = (s: 'upcoming' | 'past') => {
    setItems(null);
    setScope(s);
  };

  const setStatus = async (id: string, action: AppointmentAction) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status: ACTION_STATUS[action] });
      feedback.toast({
        tone: action === 'cancel' ? 'warning' : 'success',
        title: action === 'confirm' ? 'Visit confirmed' : action === 'complete' ? 'Marked as done' : 'Visit cancelled',
        message: action === 'cancel' ? 'Everyone involved has been notified.' : 'The patient has been notified.',
      });
      load();
    } catch (e: any) {
      feedback.alert('Could not update', e.message, { tone: 'error' });
    }
  };

  const act = async (id: string, action: AppointmentAction) => {
    if (action !== 'cancel') return setStatus(id, action);
    const ok = await feedback.confirm({
      title: 'Cancel this visit?',
      message: 'This cannot be undone. We will let everyone involved know.',
      confirmText: 'Cancel visit',
      cancelText: 'Keep it',
      destructive: true,
      icon: 'calendar-clear-outline',
    });
    if (ok) setStatus(id, action);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text variant="display">Visits</Text>
        <Text variant="small" color={colors.muted} style={{ marginTop: 2 }}>
          {isDoctor ? 'Booking requests and your schedule' : 'Your booked and past appointments'}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <Segmented
            options={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }]}
            value={scope}
            onChange={changeScope}
          />
        </View>
      </View>

      <FlatList
        data={items ?? []}
        keyExtractor={(a) => a._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.primary]} onRefresh={async () => { setRefreshing(true); await load().catch(() => undefined); setRefreshing(false); }} />}
        ListEmptyComponent={
          items === null ? (
            <View style={{ gap: spacing.md }}>
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={scope === 'upcoming' ? 'calendar-outline' : 'time-outline'}
                title={scope === 'upcoming' ? 'No upcoming visits' : 'No past visits'}
                message={
                  scope === 'upcoming'
                    ? isDoctor ? 'New booking requests from patients will show up here.' : 'Find a doctor near you and book your first visit in a few taps.'
                    : 'Completed and cancelled visits will be listed here.'
                }
                action={scope === 'upcoming' && !isDoctor ? <Button title="Find a doctor" icon="search" size="sm" onPress={() => router.push('/(tabs)')} /> : undefined}
              />
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const when = new Date(item.startsAt);
          const status = STATUS[item.status];
          const name = (isDoctor ? item.patient?.name : item.doctor?.user?.name) ?? 'Visit';
          const subtitle = isDoctor
            ? item.reason || 'Consultation'
            : item.practice?.department?.name ?? item.doctor?.specialty ?? 'Consultation';
          const awaiting = item.status === 'pending' && !item.actions.includes('confirm');
          return (
            <FadeInView delay={Math.min(index * 60, 300)}>
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.dateBox}>
                    <Text variant="caption" color={colors.primaryDark} style={{ textTransform: 'uppercase' }}>
                      {when.toLocaleDateString('en-US', { month: 'short' })}
                    </Text>
                    <Text variant="h1" color={colors.primaryDark} style={{ lineHeight: 28 }}>{when.getDate()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" numberOfLines={1}>{name}</Text>
                    <Text variant="small" color={colors.primary} numberOfLines={1}>{subtitle}</Text>
                    <View style={styles.badges}>
                      <View style={[styles.status, { backgroundColor: status.bg }]}>
                        <Ionicons name={status.icon} size={12} color={status.fg} />
                        <Text variant="caption" color={status.fg}>{status.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.details}>
                  <View style={styles.detail}>
                    <Ionicons name="time-outline" size={15} color={colors.muted} />
                    <Text variant="small" color={colors.inkSoft}>
                      {when.toLocaleDateString('en-US', { weekday: 'short' })}, {when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                  {item.facility && (
                    <View style={[styles.detail, { flex: 1 }]}>
                      <Ionicons name={item.facility.type === 'hospital' ? 'business-outline' : 'medkit-outline'} size={15} color={colors.muted} />
                      <Text variant="small" color={colors.inkSoft} numberOfLines={1} style={{ flex: 1 }}>{item.facility.name}</Text>
                    </View>
                  )}
                </View>

                {awaiting && (
                  <View style={styles.note}>
                    <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
                    <Text variant="small" color={colors.inkSoft}>
                      {item.facility?.type === 'hospital' ? 'Waiting for reception to confirm' : 'Waiting for the doctor to confirm'}
                    </Text>
                  </View>
                )}

                {item.actions.length > 0 && (
                  <View style={styles.actions}>
                    {item.actions.map((action) => (
                      <Pressable
                        key={action}
                        onPress={() => act(item._id, action)}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          action === 'cancel' ? styles.actionCancel : styles.actionPrimary,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text variant="label" color={action === 'cancel' ? colors.danger : '#fff'}>{ACTION_LABEL[action]}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </FadeInView>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateBox: { width: 58, height: 62, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', marginTop: 6 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  details: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.sm + 4, borderTopWidth: 1, borderTopColor: colors.line },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.sm, backgroundColor: colors.warningSoft },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionPrimary: { backgroundColor: colors.primary },
  actionCancel: { backgroundColor: colors.dangerSoft },
});

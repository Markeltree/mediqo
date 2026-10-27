import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../src/context/AuthContext';
import { useArea } from '../../src/context/AreaContext';
import { api } from '../../src/lib/api';
import { FadeInView } from '../../src/components/FadeInView';
import { Avatar, Text, feedback } from '../../src/components/ui';
import { colors, gradients, radius, shadow, spacing } from '../../src/theme';
import type { Role } from '../../src/lib/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ROLE_LABEL: Record<Role, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  facility_admin: 'Facility admin',
  receptionist: 'Reception',
  admin: 'Admin',
};

function Row({ icon, label, value, right, onPress, last }: {
  icon: IconName;
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { opacity: 0.6 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        {value && <Text variant="small" color={colors.muted} numberOfLines={1}>{value}</Text>}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.faint} />)}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuth();
  const { area } = useArea();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Light status bar icons over the gradient header
  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('dark');
  }, []));

  const toggleNotifications = async (value: boolean) => {
    try {
      const { data } = await api.patch('/auth/me', { notificationsEnabled: value });
      setUser(data.user);
      feedback.toast({
        tone: value ? 'success' : 'info',
        icon: value ? 'notifications' : 'notifications-off',
        title: value ? 'Notifications on' : 'Notifications off',
        message: value ? "We'll let you know when your visits change." : 'You can turn them back on anytime.',
      });
    } catch (e: any) {
      feedback.alert('Could not save', e.message, { tone: 'error' });
    }
  };

  const signOut = async () => {
    const ok = await feedback.confirm({ title: 'Sign out?', message: 'You can sign back in anytime with your email and password.', confirmText: 'Sign out', destructive: true, icon: 'log-out-outline' });
    if (ok) logout();
  };

  const [deleting, setDeleting] = useState(false);
  const deleteAccount = async () => {
    const ok = await feedback.confirm({
      title: 'Delete your account?',
      message: 'This permanently deletes your profile, visits and notifications, and cancels any upcoming visits. It cannot be undone.',
      confirmText: 'Delete account',
      cancelText: 'Keep account',
      destructive: true,
      icon: 'trash-outline',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete('/auth/me');
      await logout();
      feedback.toast({ tone: 'info', title: 'Account deleted', message: 'Your Mediqo account and data have been removed.' });
    } catch (e: any) {
      feedback.alert('Could not delete account', e.message, { tone: 'error' });
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.circle} />
        <FadeInView style={{ alignItems: 'center' }}>
          <View style={styles.avatarRing}>
            <Avatar name={user.name} uri={user.avatarUrl} size={84} />
          </View>
          <Text variant="h1" color="#fff" style={{ marginTop: spacing.sm + 4 }}>{user.name}</Text>
          <Text variant="small" color="rgba(255,255,255,0.8)">{user.email}</Text>
          <View style={styles.role}>
            <Text variant="caption" color="#fff">{ROLE_LABEL[user.role]}</Text>
          </View>
        </FadeInView>
      </LinearGradient>

      <FadeInView delay={100} style={styles.section}>
        <Text variant="label" color={colors.muted} style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Row icon="mail-outline" label="Email" value={user.email} />
          <Row icon="call-outline" label="Phone" value={user.phone || 'Not added'} last />
        </View>
      </FadeInView>

      <FadeInView delay={160} style={styles.section}>
        <Text variant="label" color={colors.muted} style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <Row
            icon="notifications-outline"
            label="Appointment updates"
            value="Booking changes and reminders"
            right={
              <Switch
                value={user.notificationsEnabled ?? true}
                onValueChange={toggleNotifications}
                trackColor={{ true: colors.primary, false: colors.line }}
                thumbColor="#fff"
              />
            }
          />
          <Row icon="location-outline" label="Area" value={area?.label ?? user.location?.address ?? 'Not set'} onPress={() => router.push('/area')} last />
        </View>
      </FadeInView>

      <FadeInView delay={220} style={styles.section}>
        <View style={styles.card}>
          <Pressable onPress={signOut} style={({ pressed }) => [styles.row, user.role === 'patient' && styles.rowLine, pressed && { opacity: 0.6 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            </View>
            <Text variant="bodyMedium" color={colors.danger} style={{ flex: 1 }}>Sign out</Text>
          </Pressable>
          {user.role === 'patient' && (
            <Pressable onPress={deleteAccount} disabled={deleting} style={({ pressed }) => [styles.row, (pressed || deleting) && { opacity: 0.6 }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.danger}>{deleting ? 'Deleting account…' : 'Delete account'}</Text>
                <Text variant="small" color={colors.muted}>Permanently remove your data</Text>
              </View>
            </Pressable>
          )}
        </View>
        <Text variant="caption" color={colors.faint} center style={{ marginTop: spacing.lg }}>
          Mediqo v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingBottom: spacing.xl, alignItems: 'center', overflow: 'hidden', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  circle: { position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: -70, backgroundColor: 'rgba(255,255,255,0.07)' },
  avatarRing: { padding: 4, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.25)' },
  role: { marginTop: spacing.sm + 2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: { marginBottom: spacing.sm, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: 14 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});

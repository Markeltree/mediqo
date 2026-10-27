import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';
import { Avatar, Text } from './ui';
import { formatKm } from '../lib/format';
import type { Practice } from '../lib/types';

export function DoctorCard({ doctor, onPress, hideFacility }: { doctor: Practice; onPress: () => void; hideFacility?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 }]}
    >
      <View style={styles.top}>
        <Avatar name={doctor.name} uri={doctor.avatarUrl} size={64} rounded="square" />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{doctor.name}</Text>
            {/* Patients only ever see doctors the Mediqo team has verified */}
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          </View>
          <Text variant="smallMedium" color={colors.primary}>{doctor.department?.name ?? doctor.specialty}</Text>
          {!hideFacility && (
            <View style={styles.facilityRow}>
              <Ionicons name={doctor.facility.type === 'hospital' ? 'business-outline' : 'medkit-outline'} size={13} color={colors.muted} />
              <Text variant="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>{doctor.facility.name}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.bottom}>
        <Meta icon="star" iconColor={colors.star} label={doctor.rating.toFixed(1)} sub={doctor.reviewsCount ? `(${doctor.reviewsCount})` : undefined} />
        <Meta icon="briefcase-outline" label={`${doctor.experienceYears} yrs`} />
        {doctor.distanceKm !== undefined && <Meta icon="navigate-outline" label={formatKm(doctor.distanceKm)} />}
        <View style={styles.fee}>
          <Text variant="label" color={colors.primaryDark}>Rs {doctor.fee.toLocaleString()}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Meta({ icon, iconColor = colors.muted, label, sub }: { icon: React.ComponentProps<typeof Ionicons>['name']; iconColor?: string; label: string; sub?: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text variant="smallMedium" color={colors.inkSoft}>{label}</Text>
      {sub && <Text variant="small" color={colors.faint}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  facilityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fee: { marginLeft: 'auto', backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
});

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../theme';
import { Text } from './ui';
import { formatKm } from '../lib/format';
import type { Facility } from '../lib/types';

export function FacilityCard({ facility, onPress }: { facility: Facility; onPress: () => void }) {
  const isHospital = facility.type === 'hospital';
  const shown = facility.departments.slice(0, 3);
  const more = facility.departments.length - shown.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 }]}
    >
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: isHospital ? colors.accentSoft : colors.primarySoft }]}>
          <Ionicons name={isHospital ? 'business' : 'medkit'} size={26} color={isHospital ? colors.accent : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3" numberOfLines={1}>{facility.name}</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color={colors.muted} />
            <Text variant="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>{facility.address}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </View>

      {shown.length > 0 && (
        <View style={styles.tags}>
          {shown.map((d) => (
            <View key={d._id} style={styles.tag}><Text variant="caption" color={colors.inkSoft}>{d.name}</Text></View>
          ))}
          {more > 0 && <View style={styles.tag}><Text variant="caption" color={colors.muted}>+{more}</Text></View>}
        </View>
      )}

      <View style={styles.bottom}>
        <Text variant="smallMedium" color={colors.inkSoft}>{isHospital ? 'Hospital' : 'Clinic'}</Text>
        <Text variant="small" color={colors.faint}>•</Text>
        <Text variant="smallMedium" color={colors.inkSoft}>
          {facility.doctorsCount ?? 0} {facility.doctorsCount === 1 ? 'doctor' : 'doctors'}
        </Text>
        {facility.distanceKm !== undefined && (
          <View style={[styles.row, { marginLeft: 'auto', marginTop: 0 }]}>
            <Ionicons name="navigate-outline" size={13} color={colors.muted} />
            <Text variant="smallMedium" color={colors.inkSoft}>{formatKm(facility.distanceKm)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
});

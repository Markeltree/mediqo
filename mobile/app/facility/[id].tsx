import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { DoctorCard } from '../../src/components/DoctorCard';
import { FadeInView } from '../../src/components/FadeInView';
import { LocationMap } from '../../src/components/LocationMap';
import { colors, radius, shadow, spacing } from '../../src/theme';
import type { Facility, Practice } from '../../src/lib/types';

type Detail = { facility: Facility; departments: Facility['departments']; doctors: Practice[] };

export default function FacilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/facilities/${id}`).then(({ data }) => setData(data)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <Text style={[styles.empty, { marginTop: 120 }]}>{error}</Text>;
  if (!data) return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.bg }} color={colors.primary} />;

  const { facility, departments, doctors } = data;
  const shown = department ? doctors.filter((d) => d.department?._id === department) : doctors;
  const isHospital = facility.type === 'hospital';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={shown}
        keyExtractor={(d) => d._id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 56, paddingBottom: 80 }}
        ListHeaderComponent={
          <>
            <Pressable onPress={() => router.back()} style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <FadeInView style={styles.header}>
              <View style={styles.typeRow}>
                <Ionicons name={isHospital ? 'business' : 'medkit'} size={14} color={colors.primary} />
                <Text style={styles.type}>{isHospital ? 'Hospital' : 'Clinic'}</Text>
              </View>
              <Text style={styles.name}>{facility.name}</Text>
              <Text style={styles.address}>{facility.address}</Text>
              {facility.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${facility.phone}`)} style={styles.phone}>
                  <Ionicons name="call-outline" size={14} color={colors.primary} />
                  <Text style={styles.phoneText}>{facility.phone}</Text>
                </Pressable>
              )}
              <LocationMap
                lat={facility.location.coordinates[1]}
                lng={facility.location.coordinates[0]}
                title={facility.name}
                icon={isHospital ? 'business' : 'medkit'}
                style={styles.map}
              />
            </FadeInView>

            {departments.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Departments</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {[{ _id: null as string | null, name: 'All' }, ...departments].map((d) => (
                    <Pressable key={d._id ?? 'all'} onPress={() => setDepartment(d._id)} style={[styles.chip, department === d._id && styles.chipActive]}>
                      <Text style={[styles.chipText, department === d._id && { color: '#fff' }]}>{d.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            <Text style={styles.sectionTitle}>{shown.length} {shown.length === 1 ? 'doctor' : 'doctors'}</Text>
          </>
        }
        renderItem={({ item, index }) => (
          <FadeInView delay={Math.min(index * 60, 300)}>
            <DoctorCard doctor={item} hideFacility onPress={() => router.push(`/doctor/${item._id}`)} />
          </FadeInView>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No doctors in this department yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, ...shadow },
  header: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  type: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 24, fontWeight: '700', color: colors.ink, marginTop: 6 },
  address: { fontSize: 14, color: colors.muted, marginTop: 4 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  phoneText: { color: colors.primary, fontWeight: '600' },
  map: { height: 160, borderRadius: radius.md, marginTop: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  empty: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl },
});

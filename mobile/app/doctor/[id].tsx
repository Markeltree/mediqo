import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Button } from '../../src/components/Button';
import { FadeInView } from '../../src/components/FadeInView';
import { LocationMap } from '../../src/components/LocationMap';
import { feedback } from '../../src/components/ui';
import { colors, radius, shadow, spacing } from '../../src/theme';
import type { Practice, Slot } from '../../src/lib/types';

function nextDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Local calendar date; toISOString() would give yesterday's date after midnight in UTC+ zones
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Books one doctor at one hospital/clinic. `id` is the practice id. */
export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const days = useMemo(() => nextDays(), []);
  const [doctor, setDoctor] = useState<Practice | null>(null);
  const [otherPlaces, setOtherPlaces] = useState<Practice[]>([]);
  const [date, setDate] = useState(toISODate(days[0]));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`/practices/${id}`).then(({ data }) => {
      setDoctor(data.practice);
      setOtherPlaces(data.otherPractices);
    });
  }, [id]);

  useEffect(() => {
    setSelected(null);
    api.get(`/practices/${id}/slots`, { params: { date } }).then(({ data }) => setSlots(data.slots));
  }, [id, date]);

  const book = async () => {
    if (!selected || !doctor) return feedback.alert('Pick a time', 'Select an available slot first.', { tone: 'warning', icon: 'time-outline' });
    setBooking(true);
    try {
      await api.post('/appointments', { practiceId: id, startsAt: selected, reason: reason || undefined });
      const who = doctor.facility.type === 'hospital' ? `${doctor.facility.name} reception` : 'The doctor';
      const when = new Date(selected).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      feedback.alert('Request sent!', `${when} with ${doctor.name}. ${who} will confirm shortly and we'll notify you.`, {
        tone: 'success',
        icon: 'calendar',
        actions: [
          { text: 'Stay here', style: 'cancel' },
          { text: 'View visits', onPress: () => router.replace('/(tabs)/appointments') },
        ],
      });
    } catch (e: any) {
      feedback.alert('Booking failed', e.message, { tone: 'error' });
    } finally {
      setBooking(false);
    }
  };

  if (!doctor) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.bg }} color={colors.primary} />;
  }

  const [lng, lat] = doctor.location.coordinates;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <LocationMap
          lat={lat}
          lng={lng}
          title={doctor.facility.name}
          icon={doctor.facility.type === 'hospital' ? 'business' : 'medkit'}
          style={styles.map}
          bottomInset={32}
        />
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>

        <FadeInView style={styles.header}>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.specialty}>
            {doctor.department?.name ? `${doctor.department.name} · ` : ''}{doctor.specialty} · {doctor.experienceYears} yrs
          </Text>
          <Pressable onPress={() => router.push(`/facility/${doctor.facility._id}`)}>
            <Text style={styles.address}>
              {doctor.facility.name} — {doctor.facility.address} <Text style={{ color: colors.primary }}>›</Text>
            </Text>
          </Pressable>
          <View style={styles.statRow}>
            <Stat icon="star" label={doctor.rating.toFixed(1)} />
            <Stat icon="cash-outline" label={`PKR ${doctor.fee}`} />
            <Stat icon="navigate-outline" label={doctor.distanceKm ? `${doctor.distanceKm} km` : 'Nearby'} />
          </View>
        </FadeInView>

        {otherPlaces.length > 0 && (
          <FadeInView delay={60} style={styles.section}>
            <Text style={styles.sectionTitle}>Also available at</Text>
            {otherPlaces.map((p) => (
              <Pressable key={p._id} style={styles.otherPlace} onPress={() => router.replace(`/doctor/${p._id}`)}>
                <Ionicons name={p.facility.type === 'hospital' ? 'business-outline' : 'medkit-outline'} size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.otherName}>{p.facility.name}</Text>
                  <Text style={styles.muted}>{p.facility.address}</Text>
                </View>
                <Text style={styles.otherFee}>PKR {p.fee}</Text>
              </Pressable>
            ))}
          </FadeInView>
        )}

        <FadeInView delay={100} style={styles.section}>
          <Text style={styles.sectionTitle}>Select a date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((d) => {
              const iso = toISODate(d);
              const active = iso === date;
              return (
                <Pressable key={iso} onPress={() => setDate(iso)} style={[styles.dayChip, active && styles.dayChipActive]}>
                  <Text style={[styles.dayName, active && { color: '#fff' }]}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                  <Text style={[styles.dayNum, active && { color: '#fff' }]}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </FadeInView>

        <FadeInView delay={160} style={styles.section}>
          <Text style={styles.sectionTitle}>Available times</Text>
          {slots.length === 0 ? (
            <Text style={styles.muted}>No slots on this day.</Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((s) => {
                const isSel = selected === s.startsAt;
                return (
                  <Pressable
                    key={s.startsAt}
                    disabled={!s.available}
                    onPress={() => setSelected(s.startsAt)}
                    style={[styles.slot, !s.available && styles.slotDisabled, isSel && styles.slotActive]}
                  >
                    <Text style={[styles.slotText, isSel && { color: '#fff' }, !s.available && { color: colors.muted, textDecorationLine: 'line-through' }]}>
                      {new Date(s.startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </FadeInView>

        <FadeInView delay={220} style={styles.section}>
          <Text style={styles.sectionTitle}>Reason (optional)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Persistent headache for 3 days"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.reason}
          />
        </FadeInView>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.muted}>Consultation fee</Text>
          <Text style={styles.price}>PKR {doctor.fee}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Button title={selected ? 'Request appointment' : 'Choose a time'} onPress={book} loading={booking} disabled={!selected} />
        </View>
      </View>
    </View>
  );
}

function Stat({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 240, width: '100%' },
  back: { position: 'absolute', top: 56, left: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  header: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, marginTop: -20 },
  name: { fontSize: 24, fontWeight: '700', color: colors.ink },
  specialty: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: '600' },
  address: { fontSize: 13, color: colors.muted, marginTop: 6 },
  statRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  dayChip: { width: 60, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', marginRight: spacing.sm, borderWidth: 1, borderColor: colors.line },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayName: { fontSize: 12, color: colors.muted },
  dayNum: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 2 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { paddingHorizontal: 14, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, justifyContent: 'center' },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotDisabled: { backgroundColor: colors.bg },
  slotText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  reason: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md, minHeight: 80, fontSize: 15, color: colors.ink, textAlignVertical: 'top' },
  muted: { color: colors.muted, fontSize: 13 },
  otherPlace: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md, marginBottom: spacing.sm },
  otherName: { fontSize: 14, fontWeight: '600', color: colors.ink },
  otherFee: { fontSize: 13, fontWeight: '600', color: colors.ink },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  price: { fontSize: 20, fontWeight: '700', color: colors.ink },
});

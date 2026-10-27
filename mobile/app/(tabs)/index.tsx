import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useArea } from '../../src/context/AreaContext';
import { Button } from '../../src/components/Button';
import { DoctorCard } from '../../src/components/DoctorCard';
import { FacilityCard } from '../../src/components/FacilityCard';
import { FadeInView } from '../../src/components/FadeInView';
import { Avatar, CardSkeleton, EmptyState, Segmented, Text } from '../../src/components/ui';
import { colors, fonts, gradients, radius, shadow, shadowLg, spacing } from '../../src/theme';
import type { Facility, Practice } from '../../src/lib/types';

type McIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// `value` must match Doctor.specialty exactly; the server filters on it
const SPECIALTIES: { value: string; label: string; icon: McIcon; tint: string }[] = [
  { value: 'All', label: 'All', icon: 'view-grid-outline', tint: '#0B8A83' },
  { value: 'General Practice', label: 'General', icon: 'stethoscope', tint: '#2F6FED' },
  { value: 'Dermatology', label: 'Skin', icon: 'hand-back-right-outline', tint: '#C2571A' },
  { value: 'Cardiology', label: 'Heart', icon: 'heart-pulse', tint: '#DC2626' },
  { value: 'Pediatrics', label: 'Child', icon: 'baby-face-outline', tint: '#6D3FC4' },
  { value: 'Dentist', label: 'Dental', icon: 'tooth-outline', tint: '#0E7490' },
];

type Mode = 'doctors' | 'hospital' | 'clinic';
const MODES: { key: Mode; label: string }[] = [
  { key: 'doctors', label: 'Doctors' },
  { key: 'hospital', label: 'Hospitals' },
  { key: 'clinic', label: 'Clinics' },
];

type Row = { kind: 'doctor'; item: Practice } | { kind: 'facility'; item: Facility };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const RADIUS_KM = 50;

type SearchResults = { practices: Practice[]; facilities: Facility[] };

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { area, status: areaStatus, refresh: refreshArea } = useArea();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('doctors');
  const [doctors, setDoctors] = useState<Practice[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unread, setUnread] = useState(0);

  useFocusEffect(useCallback(() => {
    api.get('/notifications').then(({ data }) => setUnread(data.unread)).catch(() => undefined);
  }, []));

  // Light status bar over the gradient; once it scrolls away, a solid strip and dark icons keep the bar readable
  const [scrolled, setScrolled] = useState(false);
  useFocusEffect(useCallback(() => {
    setStatusBarStyle(scrolled ? 'dark' : 'light');
    return () => setStatusBarStyle('dark');
  }, [scrolled]));

  // Nearby: everything within RADIUS_KM of the current area
  const loadNearby = useCallback(async () => {
    if (!area) return;
    setFailed(false);
    try {
      const params: Record<string, any> = { radiusKm: RADIUS_KM, lat: area.coords.latitude, lng: area.coords.longitude };
      if (mode === 'doctors') {
        if (category !== 'All') params.specialty = category;
        const { data } = await api.get('/practices/nearby', { params });
        setDoctors(data.practices);
      } else {
        const { data } = await api.get('/facilities/nearby', { params: { ...params, type: mode } });
        setFacilities(data.facilities);
      }
    } catch {
      setFailed(true);
      if (mode === 'doctors') setDoctors([]);
      else setFacilities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [area, category, mode]);

  useEffect(() => {
    if (areaStatus !== 'ready') return;
    setLoading(true);
    loadNearby();
  }, [loadNearby, areaStatus]);

  // Search: the server looks across every city, so a typed name is found even if it is far away
  const term = useDebounced(query.trim(), 300);
  const searching = term.length >= 2;
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const searchRun = useRef(0);
  const lat = area?.coords.latitude;
  const lng = area?.coords.longitude;

  const runSearch = useCallback(async () => {
    const run = ++searchRun.current;
    setSearchLoading(true);
    setSearchFailed(false);
    try {
      const { data } = await api.get('/search', { params: { q: term, lat, lng } });
      if (run === searchRun.current) setResults(data);
    } catch {
      if (run === searchRun.current) {
        setResults(null);
        setSearchFailed(true);
      }
    } finally {
      if (run === searchRun.current) {
        setSearchLoading(false);
        setRefreshing(false);
      }
    }
  }, [term, lat, lng]);

  useEffect(() => {
    if (searching) runSearch();
    else {
      searchRun.current++;
      setResults(null);
      setSearchLoading(false);
    }
  }, [searching, runSearch]);

  const openPicker = () => router.push('/area');

  const onRefresh = () => {
    setRefreshing(true);
    if (searching) runSearch();
    else if (area?.source === 'city') loadNearby();
    // Re-reading the device location yields a new area, which reloads the list
    else refreshArea().finally(() => setRefreshing(false));
  };

  const rows: Row[] = searching
    ? mode === 'doctors'
      ? (results?.practices ?? [])
        .filter((d) => category === 'All' || d.specialty === category)
        .map((item) => ({ kind: 'doctor', item }))
      : (results?.facilities ?? []).filter((f) => f.type === mode).map((item) => ({ kind: 'facility', item }))
    : mode === 'doctors'
      ? doctors.map((item) => ({ kind: 'doctor', item }))
      : facilities.map((item) => ({ kind: 'facility', item }));

  const listLoading = searching ? searchLoading && !refreshing : areaStatus === 'locating' || (areaStatus === 'ready' && loading && !refreshing);

  const noun = mode === 'doctors' ? 'Doctors' : mode === 'hospital' ? 'Hospitals' : 'Clinics';
  const firstName = user?.name.replace(/^Dr\.?\s+/i, '').split(' ')[0];

  const areaLabel = areaStatus === 'locating' ? 'Locating…' : area?.label ?? 'Choose your area';
  const listTitle = searching
    ? `Results for "${term}"`
    : area?.source === 'city' ? `${noun} in ${area.label}` : `${noun} near you`;

  const changeArea = <Button title="Change area" icon="location-outline" variant="outline" size="sm" onPress={openPicker} />;
  const empty = searching ? (
    searchFailed ? (
      <EmptyState icon="cloud-offline-outline" title="Search failed" message="Check your connection and try again." action={<Button title="Retry" size="sm" variant="ghost" onPress={runSearch} />} />
    ) : (
      <EmptyState icon="search-outline" title="No matches" message={`No ${noun.toLowerCase()} on Mediqo match "${term}". Try a doctor's name, a specialty like "skin", or a hospital.`} />
    )
  ) : areaStatus === 'unavailable' ? (
    <EmptyState
      icon="map-outline"
      title="Where should we look?"
      message="Turn on location access, or choose your city to see doctors and hospitals near you. You can also search by name above."
      action={<Button title="Choose city" icon="location-outline" size="sm" onPress={openPicker} />}
    />
  ) : failed ? (
    <EmptyState icon="cloud-offline-outline" title="Couldn't load results" message="Check your connection and try again." action={<Button title="Retry" size="sm" variant="ghost" onPress={() => { setLoading(true); loadNearby(); }} />} />
  ) : (
    <EmptyState
      icon="location-outline"
      title={`No ${noun.toLowerCase()} within ${RADIUS_KM} km`}
      message={`We haven't found ${category === 'All' || mode !== 'doctors' ? noun.toLowerCase() : category.toLowerCase() + ' doctors'} around ${area?.label ?? 'you'} yet. Try another city, or search by name.`}
      action={changeArea}
    />
  );

  const header = (
    <>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={[styles.orb, { width: 200, height: 200, top: -70, right: -50 }]} />
        <FadeInView style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text variant="smallMedium" color="rgba(255,255,255,0.8)">{greeting()},</Text>
            <Text variant="h1" color="#fff" numberOfLines={1}>{firstName}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} style={styles.bell} hitSlop={6}>
            <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={22} color="#fff" />
            {unread > 0 && (
              <View style={styles.bellBadge}>
                <Text variant="caption" color="#fff" style={{ fontFamily: fonts.bold, fontSize: 10 }}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.avatarRing}>
            <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size={44} />
          </Pressable>
        </FadeInView>
        <FadeInView delay={60}>
          <Pressable onPress={openPicker} style={({ pressed }) => [styles.locPill, pressed && { opacity: 0.8 }]} hitSlop={6}>
            <Ionicons name={area?.source === 'gps' ? 'navigate' : 'location'} size={14} color="#fff" />
            <Text variant="smallMedium" color="#fff" numberOfLines={1} style={{ flexShrink: 1 }}>{areaLabel}</Text>
            <Ionicons name="chevron-down" size={14} color="#fff" />
          </Pressable>
        </FadeInView>
      </LinearGradient>

      <FadeInView delay={100} style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.primary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search doctors, hospitals, specialties"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.faint} />
          </Pressable>
        )}
      </FadeInView>

      <View style={styles.body}>
        <FadeInView delay={140}>
          <Pressable onPress={() => router.push('/(tabs)/assistant')} style={({ pressed }) => [styles.triage, pressed && { opacity: 0.92 }]}>
            <View style={styles.triageIcon}>
              <Ionicons name="sparkles" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Not sure who to see?</Text>
              <Text variant="small" color={colors.muted}>Describe your symptoms and we'll suggest a specialist.</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.accent} />
          </Pressable>
        </FadeInView>

        {mode === 'doctors' && (
          <FadeInView delay={180}>
            <Text variant="h2" style={styles.sectionTitle}>Specialties</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.md }}>
              {SPECIALTIES.map((s) => {
                const active = category === s.value;
                return (
                  <Pressable
                    key={s.value}
                    onPress={() => { Haptics.selectionAsync().catch(() => undefined); setCategory(s.value); }}
                    style={styles.spec}
                  >
                    <View style={[styles.specIcon, active ? { backgroundColor: s.tint } : { backgroundColor: s.tint + '14' }]}>
                      <MaterialCommunityIcons name={s.icon} size={26} color={active ? '#fff' : s.tint} />
                    </View>
                    <Text variant="caption" color={active ? colors.ink : colors.muted} style={active && { fontFamily: fonts.bold }}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </FadeInView>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <Segmented<Mode> options={MODES} value={mode} onChange={setMode} />
        </View>

        <View style={styles.listHead}>
          <Text variant="h2" numberOfLines={1} style={{ flexShrink: 1 }}>{listTitle}</Text>
          {!listLoading && rows.length > 0 && <Text variant="smallMedium" color={colors.muted}>{rows.length} found</Text>}
        </View>
        {searching && (
          <View style={styles.scopeNote}>
            <Ionicons name="globe-outline" size={14} color={colors.muted} />
            <Text variant="small" color={colors.muted}>Searching all cities{area ? `, nearest to ${area.label} first` : ''}</Text>
          </View>
        )}

        {listLoading && [0, 1, 2].map((i) => <CardSkeleton key={i} />)}
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={listLoading ? [] : rows}
        keyExtractor={(r) => r.item._id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > 140;
          if (past !== scrolled) setScrolled(past);
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={[colors.primary]} progressViewOffset={insets.top} />
        }
        ListHeaderComponent={header}
        renderItem={({ item: row, index }) => (
          <FadeInView delay={Math.min(index * 50, 250)} style={{ paddingHorizontal: spacing.md }}>
            {row.kind === 'doctor' ? (
              <DoctorCard doctor={row.item} onPress={() => router.push(`/doctor/${row.item._id}`)} />
            ) : (
              <FacilityCard facility={row.item} onPress={() => router.push(`/facility/${row.item._id}`)} />
            )}
          </FadeInView>
        )}
        ListEmptyComponent={listLoading ? null : empty}
      />
      {scrolled && <View style={[styles.statusStrip, { height: insets.top }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  statusStrip: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.bg },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: 44, overflow: 'hidden', borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute', top: 6, right: 6, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0E8F8C',
  },
  avatarRing: { padding: 2, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  locPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%',
    marginTop: spacing.md, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.16)',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, marginHorizontal: spacing.md,
    marginTop: -28, height: 56, paddingHorizontal: spacing.md, borderRadius: radius.lg, ...shadowLg,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  triage: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.accentSoft, ...shadow,
  },
  triageIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: spacing.lg, marginBottom: 12 },
  spec: { alignItems: 'center', gap: 6, width: 64 },
  specIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scopeNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4, marginBottom: 12 },
  listHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: 12 },
});

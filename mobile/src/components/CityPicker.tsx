import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useArea } from '../context/AreaContext';
import { citiesNear, popularCities, sameCity, searchCities, type City } from '../lib/cities';
import { colors, fonts, radius, spacing } from '../theme';
import { Text } from './ui';

/**
 * Bottom sheet for choosing where discovery searches: the device location, a city from the built-in world list,
 * or any place the phone's geocoder can find ("Search anywhere").
 * Shown by the /area route as a transparent modal screen; RN's <Modal> lays out wrongly on Android's new architecture.
 */
export function CityPickerSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { area, chooseCity } = useArea();
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [gpsFailed, setGpsFailed] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  const pick = async (city: City) => {
    Haptics.selectionAsync().catch(() => undefined);
    await chooseCity(city);
    onClose();
  };

  const useDevice = async () => {
    setLocating(true);
    setGpsFailed(false);
    const next = await chooseCity(null);
    setLocating(false);
    if (next?.source === 'gps') onClose();
    else setGpsFailed(true);
  };

  // Towns too small for the built-in list: ask the platform geocoder (no API key needed)
  const searchAnywhere = async () => {
    const text = query.trim();
    setGeocoding(true);
    setGeoError('');
    try {
      const [hit] = await Location.geocodeAsync(text);
      if (!hit) throw new Error('not found');
      const [place] = await Location.reverseGeocodeAsync({ latitude: hit.latitude, longitude: hit.longitude }).catch(() => []);
      const name = place?.city || place?.subregion || place?.district || text;
      const region = [place?.region && place.region !== name ? place.region : null, place?.country].filter(Boolean).join(', ');
      await pick({ name, region, latitude: hit.latitude, longitude: hit.longitude });
    } catch {
      setGeoError(`Couldn't find "${text}". Check the spelling or pick a nearby city.`);
      setGeocoding(false);
    }
  };

  const q = query.trim();
  const near = area?.coords;
  const cities = useMemo(
    () => (q ? searchCities(q) : near ? citiesNear(near) : popularCities()),
    [q, near?.latitude, near?.longitude] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const listTitle = q ? (cities.length ? 'Cities' : '') : near ? 'Nearby cities' : 'Popular cities';

  return (
    <View style={styles.root}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
      <Animated.View entering={SlideInDown.springify().damping(20).stiffness(180)} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text variant="h2">Choose your area</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
        </View>
        <Text variant="small" color={colors.muted} style={{ marginBottom: spacing.md }}>
          We'll show doctors and hospitals within 50 km.
        </Text>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search any city or town"
            onSubmitEditing={() => q.length >= 2 && !cities.length && searchAnywhere()}
            returnKeyType="search"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
          />
        </View>

        <Pressable onPress={useDevice} disabled={locating} style={({ pressed }) => [styles.row, styles.deviceRow, pressed && { opacity: 0.8 }]}>
          <View style={[styles.rowIcon, { backgroundColor: colors.primary }]}>
            {locating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="navigate" size={18} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h3" color={colors.primaryDark}>Use my current location</Text>
            <Text variant="small" color={colors.muted}>{locating ? 'Finding you…' : 'Most accurate results'}</Text>
          </View>
          {area?.source === 'gps' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
        </Pressable>

        {gpsFailed && (
          <View style={styles.warn}>
            <Ionicons name="warning" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="smallMedium" color={colors.inkSoft}>Couldn't get your location. Turn on location access, or pick a city below.</Text>
              <Pressable onPress={() => Linking.openSettings()} hitSlop={6}>
                <Text variant="label" color={colors.primary} style={{ marginTop: 4 }}>Open settings</Text>
              </Pressable>
            </View>
          </View>
        )}

        <FlatList
          data={cities}
          keyExtractor={(c) => `${c.name}|${c.latitude},${c.longitude}`}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={listTitle ? <Text variant="label" color={colors.muted} style={styles.listTitle}>{listTitle}</Text> : null}
          ListEmptyComponent={<Text variant="small" color={colors.muted} center style={{ paddingTop: spacing.md }}>No city in our list matches "{q}".</Text>}
          ListFooterComponent={
            <View>
              {q.length >= 2 && (
                <Pressable onPress={searchAnywhere} disabled={geocoding} style={({ pressed }) => [styles.row, styles.anywhere, pressed && { opacity: 0.8 }]}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                    {geocoding ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="earth" size={18} color={colors.primary} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color={colors.primaryDark} numberOfLines={1}>Search anywhere for "{q}"</Text>
                    <Text variant="small" color={colors.muted}>Find any town, area or address worldwide</Text>
                  </View>
                </Pressable>
              )}
              {!!geoError && <Text variant="small" color={colors.danger} style={{ paddingHorizontal: 4, paddingBottom: spacing.sm }}>{geoError}</Text>}
              <Text variant="caption" color={colors.faint} center style={{ paddingVertical: spacing.sm }}>City data © GeoNames (CC BY 4.0)</Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = area?.source === 'city' && sameCity(area.coords, item);
            return (
              <Pressable onPress={() => pick(item)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]}>
                <View style={styles.rowIcon}>
                  <Ionicons name="business-outline" size={17} color={colors.inkSoft} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{item.name}</Text>
                  <Text variant="small" color={colors.muted} numberOfLines={1}>{item.region}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(11,28,44,0.45)' },
  sheet: {
    width: '100%', maxHeight: '82%', backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14,
    borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderRadius: radius.md },
  deviceRow: { marginBottom: spacing.xs },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: 50 },
  listTitle: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: 2 },
  anywhere: { marginTop: spacing.xs },
  warn: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.warningSoft, marginBottom: spacing.sm },
});

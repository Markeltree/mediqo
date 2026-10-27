import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useArea } from '../context/AreaContext';
import { CITIES, type City } from '../lib/cities';
import { colors, fonts, radius, spacing } from '../theme';
import { Text } from './ui';

/**
 * Bottom sheet for choosing where discovery searches: the device location or a city.
 * Shown by the /area route as a transparent modal screen; RN's <Modal> lays out wrongly on Android's new architecture.
 */
export function CityPickerSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { area, chooseCity } = useArea();
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [gpsFailed, setGpsFailed] = useState(false);


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

  const q = query.trim().toLowerCase();
  const cities = q ? CITIES.filter((c) => c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q)) : CITIES;

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
            placeholder="Search city"
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
          keyExtractor={(c) => c.name}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text variant="small" color={colors.muted} center style={{ padding: spacing.lg }}>No city matches "{query.trim()}"</Text>}
          renderItem={({ item }) => {
            const active = area?.source === 'city' && area.label === item.name;
            return (
              <Pressable onPress={() => pick(item)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]}>
                <View style={styles.rowIcon}>
                  <Ionicons name="business-outline" size={17} color={colors.inkSoft} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{item.name}</Text>
                  <Text variant="small" color={colors.muted}>{item.province}</Text>
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
  warn: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.warningSoft, marginBottom: spacing.sm },
});

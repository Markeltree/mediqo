import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow } from '../../theme';
import { Text } from './Text';

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.track}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.key);
            }}
            style={[styles.btn, active && styles.active]}
          >
            <Text variant="label" color={active ? colors.ink : colors.muted}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4 },
  btn: { flex: 1, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.surface, ...shadow },
});

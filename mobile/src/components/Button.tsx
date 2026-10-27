import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '../theme';
import { Text } from './ui/Text';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  size?: 'md' | 'sm';
  style?: ViewStyle;
};

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: '#fff' },
  ghost: { bg: colors.primarySoft, fg: colors.primaryDark },
  outline: { bg: colors.surface, fg: colors.ink, border: colors.line },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon, size = 'md', style }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const v = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        disabled={inactive}
        onPressIn={() => (scale.value = withSpring(0.97, { damping: 15 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 15 }))}
        onPress={() => {
          Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }}
        style={[
          styles.base,
          size === 'sm' && styles.sm,
          { backgroundColor: v.bg },
          v.border && { borderWidth: 1, borderColor: v.border },
          inactive && { opacity: 0.5 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <View style={styles.row}>
            {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} />}
            {/* letterSpacing 0: Android mis-measures negative spacing with custom fonts and wraps the last word away */}
            <Text variant={size === 'sm' ? 'label' : 'h3'} color={v.fg} numberOfLines={1} style={{ letterSpacing: 0 }}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  sm: { height: 40, borderRadius: radius.sm, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

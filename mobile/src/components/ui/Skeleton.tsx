import React, { useEffect } from 'react';
import { View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, radius, shadow, spacing } from '../../theme';

export function Skeleton({ width = '100%', height = 14, r = 8, style }: { width?: DimensionValue; height?: number; r?: number; style?: ViewStyle }) {
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceAlt }, animated, style]} />;
}

/** Placeholder shaped like a DoctorCard / FacilityCard while a list loads. */
export function CardSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow }}>
      <Skeleton width={64} height={64} r={18} />
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" />
        <Skeleton width="80%" />
      </View>
    </View>
  );
}

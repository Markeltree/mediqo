import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

/** Fades and slides children in, with an optional stagger delay (ms). */
export function FadeInView({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { colors, typography, type TypeVariant } from '../../theme';

type Props = TextProps & { variant?: TypeVariant; color?: string; center?: boolean };

/** App text with the brand font. Use instead of React Native's Text so weights render on Android. */
export function Text({ variant = 'body', color = colors.ink, center, style, ...rest }: Props) {
  return <RNText {...rest} style={[typography[variant], { color }, center && { textAlign: 'center' }, style]} />;
}

import React from 'react';
import { Image, View } from 'react-native';
import { fonts } from '../../theme';
import { Text } from './Text';

// Soft background / strong foreground pairs; a name always maps to the same pair
const PALETTE = [
  ['#E3F4F2', '#0B7A74'],
  ['#E8F0FE', '#2557C7'],
  ['#FDEFE6', '#C2571A'],
  ['#F1EAFD', '#6D3FC4'],
  ['#FCE8EF', '#B8325E'],
  ['#E9F5E3', '#3E7D1F'],
];

const initials = (name: string) =>
  name.replace(/^Dr\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export function Avatar({ name, uri, size = 52, rounded = 'circle' }: { name: string; uri?: string; size?: number; rounded?: 'circle' | 'square' }) {
  const r = rounded === 'circle' ? size / 2 : size * 0.3;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} />;

  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [bg, fg] = PALETTE[hash % PALETTE.length];
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text color={fg} style={{ fontFamily: fonts.bold, fontSize: size * 0.36, lineHeight: size * 0.46 }}>{initials(name)}</Text>
    </View>
  );
}

import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts, gradients } from '../../theme';
import { Text } from './Text';

/** Brand mark: gradient tile with a pulse glyph, optionally followed by the wordmark. */
export function Logo({ size = 44, wordmark = true, light = false }: { size?: number; wordmark?: boolean; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LinearGradient
        colors={light ? ['#FFFFFF', '#E6F6F4'] : gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="pulse" size={size * 0.56} color={light ? '#0B8A83' : '#fff'} />
      </LinearGradient>
      {wordmark && (
        <Text color={light ? '#fff' : '#0B1C2C'} style={{ fontFamily: fonts.extrabold, fontSize: size * 0.58, letterSpacing: -0.8 }}>
          mediqo
        </Text>
      )}
    </View>
  );
}

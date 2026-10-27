import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#F4F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3F6',
  ink: '#0B1C2C',
  inkSoft: '#3A4A5C',
  muted: '#6B7B8D',
  faint: '#A3B1BF',
  line: '#E3EAF0',

  primary: '#0B8A83',
  primaryDark: '#06635E',
  primarySoft: '#E3F4F2',
  accent: '#2F6FED',
  accentSoft: '#E8F0FE',

  success: '#16A34A',
  successSoft: '#E7F6EC',
  warning: '#D97706',
  warningSoft: '#FDF3E1',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  star: '#F5A524',
};

/** Brand gradient, top-left to bottom-right. */
export const gradients = {
  brand: ['#0FA39A', '#0B7D8F'] as const,
  hero: ['#0E9A92', '#0B6E85'] as const,
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

// Custom fonts ignore fontWeight on Android, so each step picks its own family
export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 38, letterSpacing: -0.8 },
  h1: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typography;

export const shadow = {
  shadowColor: '#0B1C2C',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

export const shadowLg = {
  shadowColor: '#0B1C2C',
  shadowOpacity: 0.12,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 8,
};

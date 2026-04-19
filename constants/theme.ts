/**
 * Hairtrack design tokens.
 *
 * Intentionally diverges from the original App Store references:
 *  - emerald primary (associated with growth, wellness) instead of royal blue
 *  - warm off-white surfaces instead of pure white
 *  - soft peach secondary for streaks and highlights
 *  - separate cards with borders / subtle shadows instead of saturated panels
 */

import { Platform } from 'react-native';

const emerald = '#059669'; // emerald-600
const emeraldDark = '#34D399'; // emerald-400
const emeraldSoftLight = '#D1FAE5'; // emerald-100
const emeraldSoftDark = '#064E3B'; // emerald-900 (as "soft" bg in dark)
const peach = '#F97316'; // orange-500 (streaks, reminders)
const peachSoftLight = '#FFEDD5'; // orange-100

export const Colors = {
  light: {
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
    background: '#FAFAF7',
    surface: '#F5F5F4',
    surfaceElevated: '#FFFFFF',
    tint: emerald,
    accent: emerald,
    accentSoft: emeraldSoftLight,
    accentText: '#FFFFFF',
    secondary: peach,
    secondarySoft: peachSoftLight,
    icon: '#78716C',
    border: '#E7E5E4',
    borderStrong: '#D6D3D1',
    tabIconDefault: '#A8A29E',
    tabIconSelected: emerald,
    success: '#22C55E',
    warning: '#EAB308',
    danger: '#EF4444',
  },
  dark: {
    text: '#F5F5F4',
    textSecondary: '#A8A29E',
    textMuted: '#78716C',
    background: '#0C0A09',
    surface: '#1C1917',
    surfaceElevated: '#292524',
    tint: emeraldDark,
    accent: emeraldDark,
    accentSoft: emeraldSoftDark,
    accentText: '#052E21',
    secondary: peach,
    secondarySoft: '#431407',
    icon: '#A8A29E',
    border: '#292524',
    borderStrong: '#44403C',
    tabIconDefault: '#78716C',
    tabIconSelected: emeraldDark,
    success: '#34D399',
    warning: '#FACC15',
    danger: '#F87171',
  },
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

/** Soft card shadow — iOS gets real shadow, Android gets elevation. */
export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {},
  }) as object,
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    android: { elevation: 1 },
    default: {},
  }) as object,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

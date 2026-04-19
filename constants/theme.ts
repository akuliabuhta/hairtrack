/**
 * Hairtrack design tokens — derived from the brand logo:
 * orange→purple gradient with deep purple typography.
 */

import { Platform } from 'react-native';

const brandPurple = '#7C2DB2'; // primary — derived from logo deep magenta
const brandPurpleDark = '#9D5BD1'; // dark-mode tint
const brandPurpleSoftLight = '#F3E8FF'; // purple-100-ish
const brandPurpleSoftDark = '#3B1361';

const brandOrange = '#F97316'; // orange-500 — secondary accent, streaks
const brandOrangeSoft = '#FFEDD5'; // orange-100

const brandTextDark = '#2D1B4E'; // very dark purple (from the wordmark)
const brandTextDarkSubtle = '#6B6284';

/** Orange→purple gradient used on primary CTAs, hero, icon. */
export const BRAND_GRADIENT = ['#F97316', '#9D3FCB', '#7C2DB2'] as const;

export const Colors = {
  light: {
    text: brandTextDark,
    textSecondary: brandTextDarkSubtle,
    textMuted: '#A19AB0',
    background: '#FAF9FC', // warm off-white with slight purple tint
    surface: '#F3F0F7',
    surfaceElevated: '#FFFFFF',
    tint: brandPurple,
    accent: brandPurple,
    accentSoft: brandPurpleSoftLight,
    accentText: '#FFFFFF',
    secondary: brandOrange,
    secondarySoft: brandOrangeSoft,
    icon: brandTextDarkSubtle,
    border: '#E5E1EC',
    borderStrong: '#CFC8DC',
    tabIconDefault: '#A19AB0',
    tabIconSelected: brandPurple,
    success: '#22C55E',
    warning: '#EAB308',
    danger: '#EF4444',
  },
  dark: {
    text: '#F5F3F7',
    textSecondary: '#B5AEC7',
    textMuted: '#7A7288',
    background: '#1A0F2E',
    surface: '#251838',
    surfaceElevated: '#2E1F46',
    tint: brandPurpleDark,
    accent: brandPurpleDark,
    accentSoft: brandPurpleSoftDark,
    accentText: '#FFFFFF',
    secondary: brandOrange,
    secondarySoft: '#4A1A0C',
    icon: '#B5AEC7',
    border: '#352548',
    borderStrong: '#4A3563',
    tabIconDefault: '#7A7288',
    tabIconSelected: brandPurpleDark,
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
      shadowColor: '#2D1B4E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {},
  }) as object,
  sm: Platform.select({
    ios: {
      shadowColor: '#2D1B4E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
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

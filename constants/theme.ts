/**
 * Hairtrack design tokens.
 * Brand palette pulled from the source screenshots — deep royal blue accent
 * on a white/very-light-gray surface, in iOS-style rounded cards.
 */

import { Platform } from 'react-native';

const brandBlue = '#002FCC';
const brandBlueDark = '#3A5BFF';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#6B6F76',
    textMuted: '#9AA0A6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceElevated: '#FFFFFF',
    tint: brandBlue,
    accent: brandBlue,
    accentText: '#FFFFFF',
    icon: '#687076',
    border: '#E5E5EA',
    tabIconDefault: '#8E8E93',
    tabIconSelected: brandBlue,
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#A0A4AA',
    textMuted: '#6B6F76',
    background: '#0B0B0F',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    tint: brandBlueDark,
    accent: brandBlueDark,
    accentText: '#FFFFFF',
    icon: '#9BA1A6',
    border: '#2C2C2E',
    tabIconDefault: '#8E8E93',
    tabIconSelected: brandBlueDark,
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
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

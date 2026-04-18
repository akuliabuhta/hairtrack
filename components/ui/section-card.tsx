import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** "elevated" = white card on a tinted bg; "muted" = light gray card on white */
  variant?: 'elevated' | 'muted';
  padding?: keyof typeof Spacing | 'none';
};

export function SectionCard({ children, style, variant = 'muted', padding = 'lg' }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const bg = variant === 'elevated' ? palette.surfaceElevated : palette.surface;
  const pad = padding === 'none' ? 0 : Spacing[padding];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, padding: pad, borderColor: palette.border },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 0,
  },
});

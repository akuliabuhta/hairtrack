import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { BRAND_GRADIENT, Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  title: string;
  onPress?: () => void;
  /** `gradient` uses the brand orange→purple sweep; `solid` is flat purple; `ghost` is borderless. */
  variant?: 'gradient' | 'solid' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'gradient',
  loading,
  disabled,
  icon,
  style,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const isGhost = variant === 'ghost';
  const isSolid = variant === 'solid';
  const fg = isGhost ? palette.accent : '#FFFFFF';

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          opacity: pressed || disabled ? 0.7 : 1,
          backgroundColor: isSolid ? palette.accent : isGhost ? 'transparent' : 'transparent',
          overflow: 'hidden',
        },
        style,
      ]}>
      {variant === 'gradient' ? (
        <LinearGradient
          // start from lower-left, end upper-right — mirrors the logo's arrow sweep
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          colors={[...BRAND_GRADIENT]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { marginRight: Spacing.sm },
  label: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});

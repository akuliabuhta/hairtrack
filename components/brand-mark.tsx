/**
 * Brand mark — the uploaded logo (if present).
 *
 * Two variants:
 *  - `mark` (default) — icon only, pulled from logo-mark.png (cropped from
 *    the full logo). Use for small avatars, tab icons, anywhere small.
 *  - `full` — full logo with "HairTrack" wordmark, pulled from logo.png.
 *    Use for hero / welcome screens.
 *
 * When neither file is present, falls back to a gradient tile with an
 * upward arrow so the app still looks on-brand.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BRAND_GRADIENT } from '@/constants/theme';

type Props = {
  size?: number;
  /** `mark` = icon only (default); `full` = mark + wordmark. */
  variant?: 'mark' | 'full';
  /** Tile shape: round or square corners. */
  shape?: 'tile' | 'circle';
  borderRadius?: number;
};

// Metro requires static literal `require` paths. Wrap both in try/catch
// so the app still renders if a file is missing.
let markAsset: number | null = null;
let fullAsset: number | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  markAsset = require('../assets/images/logo-mark.png');
} catch {
  markAsset = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  fullAsset = require('../assets/images/logo.png');
} catch {
  fullAsset = null;
}

export function BrandMark({
  size = 72,
  variant = 'mark',
  shape = 'tile',
  borderRadius,
}: Props) {
  const r = borderRadius ?? (shape === 'circle' ? size / 2 : size * 0.22);
  const asset = variant === 'full' ? fullAsset : markAsset ?? fullAsset;

  if (asset) {
    return (
      <Image
        source={asset}
        style={{ width: size, height: size, borderRadius: r }}
        contentFit="contain"
      />
    );
  }

  // Fallback gradient tile with arrow.
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: r }]}>
      <LinearGradient
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        colors={[...BRAND_GRADIENT]}
        style={[StyleSheet.absoluteFill, { borderRadius: r }]}
      />
      <MaterialCommunityIcons
        name="arrow-top-right-thin"
        size={size * 0.6}
        color="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

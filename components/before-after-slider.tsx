/**
 * Drag-to-compare image slider.
 *
 * Renders the "after" photo full-bleed and the "before" photo on top,
 * clipped to the left of a draggable handle. Pure RN — uses PanResponder
 * so it works everywhere including web.
 */

import React, { useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';

import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  beforeUri: string;
  afterUri: string;
  beforeLabel?: string;
  afterLabel?: string;
};

export function BeforeAfterSlider({
  beforeUri,
  afterUri,
  beforeLabel = 'До',
  afterLabel = 'После',
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const [width, setWidth] = useState(0);
  const positionRef = useRef(0.5);
  const [position, setPosition] = useState(0.5);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        if (width === 0) return;
        const next = Math.min(
          1,
          Math.max(0, positionRef.current + gesture.dx / width),
        );
        setPosition(next);
      },
      onPanResponderRelease: () => {
        positionRef.current = position;
      },
      onPanResponderTerminate: () => {
        positionRef.current = position;
      },
    }),
  ).current;

  // Keep ref in sync if width was unknown when the user started dragging.
  positionRef.current = position;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {/* After (bottom) */}
      <Image source={{ uri: afterUri }} style={styles.image} contentFit="cover" />

      {/* Before (top, clipped to position) */}
      <View style={[styles.beforeClip, { width: width * position }]}>
        <Image
          source={{ uri: beforeUri }}
          style={[styles.image, { width }]}
          contentFit="cover"
        />
      </View>

      {/* Drag handle */}
      <View
        {...responder.panHandlers}
        style={[
          styles.handleArea,
          { left: width * position - HANDLE_HIT / 2 },
        ]}>
        <View style={[styles.handleLine, { backgroundColor: '#FFF' }]} />
        <View style={[styles.handleKnob, { borderColor: palette.accent }]}>
          <Text style={{ color: palette.accent, fontSize: 14 }}>⇆</Text>
        </View>
      </View>

      {/* Labels */}
      <View style={[styles.label, { left: 12 }]}>
        <Text style={styles.labelText}>{beforeLabel}</Text>
      </View>
      <View style={[styles.label, { right: 12 }]}>
        <Text style={styles.labelText}>{afterLabel}</Text>
      </View>
    </View>
  );
}

const HANDLE_HIT = 36;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  beforeClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  handleArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    left: HANDLE_HIT / 2 - 1,
  },
  handleKnob: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  labelText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProgressScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={styles.center}>
        <Ionicons name="images-outline" size={92} color={palette.textMuted} />
        <Text style={[styles.title, { color: palette.textMuted }]}>
          Пока нет фото!
        </Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Добавьте фото в разделе «Ежедневно», и ваши фото прогресса появятся здесь.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

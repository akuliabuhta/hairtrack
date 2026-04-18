import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Treatment = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
};

export default function ProceduresScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const [treatments] = useState<Treatment[]>([
    {
      id: '1',
      name: 'Миноксидил',
      dose: '10 распыления',
      frequency: '2 x раз в день',
    },
  ]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: palette.text }]}>
          Расписание лечения
        </Text>

        {treatments.map((t) => (
          <View
            key={t.id}
            style={[styles.treatmentCard, { backgroundColor: palette.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.treatmentName, { color: palette.text }]}>
                {t.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: palette.textSecondary }]}>
                  {t.dose}
                </Text>
                <Text style={[styles.metaText, { color: palette.textSecondary, marginLeft: Spacing.lg }]}>
                  {t.frequency}
                </Text>
              </View>
            </View>
            <Pressable hitSlop={8}>
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={palette.textSecondary}
              />
            </Pressable>
          </View>
        ))}

        <View style={{ height: Spacing.xl }} />

        <PrimaryButton title="Добавить новое лечение" />

        <Pressable style={styles.shareRow}>
          <Ionicons name="share-outline" size={22} color={palette.accent} />
          <Text style={[styles.shareText, { color: palette.accent }]}>
            Поделиться
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  treatmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  treatmentName: {
    fontSize: 19,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  shareText: {
    fontSize: 17,
    fontWeight: '600',
  },
});

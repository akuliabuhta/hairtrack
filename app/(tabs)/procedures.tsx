import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProcedures } from '@/contexts/data-context';
import { PROCEDURE_KIND_META } from '@/lib/types';

export default function ProceduresScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { procedures, deleteProcedure } = useProcedures();

  const handleAdd = () => router.push('/treatment-form');
  const handleEdit = (id: string) =>
    router.push({ pathname: '/treatment-form', params: { id } });

  const handleMenu = (id: string, name: string) => {
    Alert.alert(
      name,
      'Что сделать?',
      [
        { text: 'Изменить', onPress: () => handleEdit(id) },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Удалить?', 'Это удалит лечение и историю отметок.', [
              { text: 'Отмена', style: 'cancel' },
              {
                text: 'Удалить',
                style: 'destructive',
                onPress: () => deleteProcedure(id),
              },
            ]);
          },
        },
        { text: 'Отмена', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const handleShare = async () => {
    const summary =
      procedures.length === 0
        ? 'У меня пока нет назначенного лечения в HairTrack.'
        : ['Моё расписание лечения (HairTrack):']
            .concat(
              procedures.map(
                (p) =>
                  `• ${p.name} — ${p.amount} ${p.unit}, ${p.frequencyPerDay}× в день` +
                  (p.reminderTimes.length ? ` (${p.reminderTimes.join(', ')})` : ''),
              ),
            )
            .join('\n');
    try {
      await Share.share({ message: summary });
    } catch (err) {
      console.warn('share failed', err);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: palette.text }]}>Расписание лечения</Text>

        {procedures.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.surface }]}>
            <MaterialCommunityIcons
              name="pill"
              size={36}
              color={palette.textMuted}
              style={{ alignSelf: 'center', marginBottom: 8 }}
            />
            <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>
              Нет добавленных процедур
            </Text>
            <Text style={[styles.emptyBody, { color: palette.textMuted }]}>
              Добавьте препараты или процедуры, чтобы получать напоминания и
              отслеживать выполнение по дням.
            </Text>
          </View>
        ) : (
          procedures.map((p) => {
            const meta = PROCEDURE_KIND_META[p.kind];
            return (
              <Pressable
                key={p.id}
                onPress={() => handleEdit(p.id)}
                style={[styles.treatmentCard, { backgroundColor: palette.surface }]}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: palette.surfaceElevated },
                  ]}>
                  <MaterialCommunityIcons
                    name={meta.icon as any}
                    size={22}
                    color={palette.text}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.treatmentName, { color: palette.text }]}>
                    {p.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: palette.textSecondary }]}>
                      {p.amount} {p.unit}
                    </Text>
                    <Text
                      style={[
                        styles.metaText,
                        { color: palette.textSecondary, marginLeft: Spacing.lg },
                      ]}>
                      {p.frequencyPerDay} × раз в день
                    </Text>
                  </View>
                </View>
                <Pressable hitSlop={8} onPress={() => handleMenu(p.id, p.name)}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={22}
                    color={palette.textSecondary}
                  />
                </Pressable>
              </Pressable>
            );
          })
        )}

        <View style={{ height: Spacing.xl }} />

        <PrimaryButton title="Добавить новое лечение" onPress={handleAdd} />

        <Pressable style={styles.shareRow} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={palette.accent} />
          <Text style={[styles.shareText, { color: palette.accent }]}>Поделиться</Text>
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
    gap: Spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treatmentName: { fontSize: 19, fontWeight: '600' },
  metaRow: { flexDirection: 'row', marginTop: 4 },
  metaText: { fontSize: 14 },
  emptyCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'stretch',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  shareText: { fontSize: 17, fontWeight: '600' },
});

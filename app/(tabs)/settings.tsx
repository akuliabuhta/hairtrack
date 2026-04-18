import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/contexts/data-context';
import { exportAll } from '@/lib/storage';

type Row = {
  id: string;
  label: string;
  onPress?: () => void;
};

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { profile, updateProfile, resetAll } = useProfile();

  const handleExport = async () => {
    try {
      const data = await exportAll();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        // On web just share the text — file download requires a different API.
        await Share.share({ message: json, title: 'Hairtrack backup' });
        return;
      }
      const path = `${FileSystem.cacheDirectory ?? ''}hairtrack-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Hairtrack — резервная копия',
        });
      } else {
        Alert.alert('Сохранено', `Резервная копия: ${path}`);
      }
    } catch (err) {
      console.warn('export failed', err);
      Alert.alert('Ошибка', 'Не удалось создать резервную копию.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Сбросить все данные?',
      'Удалятся все процедуры, фото, журнал и настройки. Действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: () => resetAll(),
        },
      ],
    );
  };

  const ROWS: Row[] = [
    {
      id: 'export',
      label: 'Экспорт данных',
      onPress: handleExport,
    },
    {
      id: 'feature',
      label: 'Запросить функцию',
      onPress: () => Alert.alert('Запросить функцию', 'Напишите нам: feedback@hairtrack.app'),
    },
    {
      id: 'bug',
      label: 'Сообщить об ошибке',
      onPress: () => Alert.alert('Сообщить об ошибке', 'Напишите нам: bugs@hairtrack.app'),
    },
    { id: 'rate', label: 'Оценить это приложение', onPress: () => Alert.alert('Спасибо!', 'Оценка появится в финальном релизе.') },
    { id: 'terms', label: 'Условия использования', onPress: () => Alert.alert('Условия использования', 'Будут опубликованы перед релизом.') },
    { id: 'privacy', label: 'Политика конфиденциальности', onPress: () => Alert.alert('Политика конфиденциальности', 'Все данные хранятся локально на вашем устройстве. Облачная синхронизация — опционально.') },
    { id: 'contact', label: 'Связаться с нами', onPress: () => Alert.alert('Связаться с нами', 'support@hairtrack.app') },
  ];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {/* Add widget banner */}
        <View style={[styles.widgetCard, { backgroundColor: palette.background }]}>
          <View style={[styles.widgetIcon, { backgroundColor: palette.surface }]}>
            <MaterialCommunityIcons name="widgets-outline" size={28} color={palette.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.widgetTitle, { color: palette.text }]}>
              Добавить виджет
            </Text>
            <Text style={[styles.widgetBody, { color: palette.textSecondary }]}>
              Смотрите, сколько процедур осталось на сегодня одним взглядом
              и наблюдайте, как список обновляется по мере того, как вы их отмечаете.
            </Text>
          </View>
          <Pressable hitSlop={8}>
            <Ionicons name="close" size={20} color={palette.textSecondary} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Настройки</Text>

        <View style={[styles.listCard, { backgroundColor: palette.background }]}>
          {ROWS.map((row, idx) => (
            <Pressable
              key={row.id}
              onPress={row.onPress}
              style={[
                styles.row,
                idx < ROWS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: palette.border,
                },
              ]}>
              <Text style={[styles.rowLabel, { color: palette.text }]}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text, marginTop: Spacing.xl }]}>
          Уведомления
        </Text>

        <View style={[styles.listCard, { backgroundColor: palette.background }]}>
          <View
            style={[
              styles.row,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: palette.border,
              },
            ]}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={[styles.rowLabel, { color: palette.text }]}>
                Напоминания о процедурах
              </Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>
                Уведомления в назначенное время.
              </Text>
            </View>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={(v) => updateProfile({ notificationsEnabled: v })}
            />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={[styles.rowLabel, { color: palette.text }]}>
                Ежедневная сводка
              </Text>
              <Text style={[styles.rowSub, { color: palette.textSecondary }]}>
                Получите сводку в 21:00, если остались невыполненные процедуры.
              </Text>
            </View>
            <Switch
              value={profile.dailySummary}
              onValueChange={(v) => updateProfile({ dailySummary: v })}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.text, marginTop: Spacing.xl }]}>
          Управление данными
        </Text>
        <View style={[styles.listCard, { backgroundColor: palette.background }]}>
          <Pressable onPress={handleReset} style={styles.row}>
            <Text style={[styles.rowLabel, { color: palette.danger }]}>
              Сбросить все данные
            </Text>
            <Ionicons name="trash-outline" size={18} color={palette.danger} />
          </Pressable>
        </View>

        <Text style={[styles.footerText, { color: palette.textMuted }]}>
          Hairtrack · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  widgetCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  widgetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  widgetBody: { fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 32, fontWeight: '700', marginBottom: Spacing.md },
  listCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  rowSub: { marginTop: 2, fontSize: 13 },
  footerText: { textAlign: 'center', marginTop: Spacing.xl, fontSize: 13 },
});

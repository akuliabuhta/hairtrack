import React from 'react';
import {
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

import { useRouter } from 'expo-router';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/auth-context';
import { useProfile } from '@/contexts/data-context';
import { exportAll } from '@/lib/storage';
import { showAlert } from '@/lib/alert';

type Row = {
  id: string;
  label: string;
  onPress?: () => void;
};

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { profile, updateProfile, resetAll } = useProfile();
  const { user, signOut, isConfigured } = useAuth();

  const handleExport = async () => {
    try {
      const data = await exportAll();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        // On web just share the text — file download requires a different API.
        await Share.share({ message: json, title: 'HairTrack backup' });
        return;
      }
      const path = `${FileSystem.cacheDirectory ?? ''}hairtrack-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'HairTrack — резервная копия',
        });
      } else {
        showAlert('Сохранено', `Резервная копия: ${path}`);
      }
    } catch (err) {
      console.warn('export failed', err);
      showAlert('Ошибка', 'Не удалось создать резервную копию.');
    }
  };

  const handleReset = () => {
    showAlert(
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
      onPress: () => showAlert('Запросить функцию', 'Напишите нам: feedback@hairtrack.app'),
    },
    {
      id: 'bug',
      label: 'Сообщить об ошибке',
      onPress: () => showAlert('Сообщить об ошибке', 'Напишите нам: bugs@hairtrack.app'),
    },
    { id: 'rate', label: 'Оценить это приложение', onPress: () => showAlert('Спасибо!', 'Оценка появится в финальном релизе.') },
    { id: 'terms', label: 'Условия использования', onPress: () => showAlert('Условия использования', 'Будут опубликованы перед релизом.') },
    { id: 'privacy', label: 'Политика конфиденциальности', onPress: () => showAlert('Политика конфиденциальности', 'Все данные хранятся локально на вашем устройстве. Облачная синхронизация — опционально.') },
    { id: 'contact', label: 'Связаться с нами', onPress: () => showAlert('Связаться с нами', 'support@hairtrack.app') },
  ];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {/* Account card */}
        <Pressable
          onPress={() => (user ? null : router.push('/auth'))}
          style={[styles.accountCard, { backgroundColor: palette.background }]}>
          <View style={[styles.accountAvatar, { backgroundColor: palette.accentSoft }]}>
            <MaterialCommunityIcons
              name={user ? 'account-check' : 'account-plus-outline'}
              size={26}
              color={palette.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.accountTitle, { color: palette.text }]}>
              {user ? (user.email ?? 'Ваш аккаунт') : 'Войти или создать аккаунт'}
            </Text>
            <Text style={[styles.accountBody, { color: palette.textSecondary }]}>
              {user
                ? 'Данные синхронизируются между устройствами.'
                : isConfigured
                  ? 'Синхронизируйте прогресс между устройствами.'
                  : 'Синхронизация пока не настроена — данные сохраняются на устройстве.'}
            </Text>
          </View>
          {user ? (
            <Pressable
              onPress={() =>
                showAlert('Выйти из аккаунта?', 'Локальные данные останутся на устройстве.', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Выйти', style: 'destructive', onPress: () => signOut() },
                ])
              }>
              <Ionicons name="log-out-outline" size={22} color={palette.textSecondary} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
          )}
        </Pressable>

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
          HairTrack · v1.0.0
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
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  accountAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  accountBody: { fontSize: 13, lineHeight: 18 },
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

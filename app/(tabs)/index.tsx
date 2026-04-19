import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { BrandMark } from '@/components/brand-mark';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useJournal,
  usePhotos,
  useProcedureLogs,
  useProcedures,
  useProfile,
} from '@/contexts/data-context';
import { dayKey, parseDayKey } from '@/lib/uuid';
import { persistPhoto } from '@/lib/photos';
import { PROCEDURE_KIND_META } from '@/lib/types';

const RU_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const RU_WEEKDAY_MON_FIRST = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Keep these in sync with styles.dayCell / styles.stripContent gap.
const DAY_CELL_WIDTH = 48;
const DAY_CELL_GAP = Spacing.sm; // matches stripContent.gap

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function weekdayShort(date: Date): string {
  const dow = date.getDay();
  const monIdx = (dow + 6) % 7;
  return RU_WEEKDAY_MON_FIRST[monIdx];
}

function dayOfTreatment(startDate: string | undefined, today: Date): number {
  if (!startDate) return 1;
  const start = parseDayKey(startDate);
  const diff = Math.max(
    1,
    Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  return diff;
}

/** Consecutive days (incl. today) where *every* scheduled procedure was fully completed. */
function computeStreak(
  allLogs: { procedureId: string; date: string; count: number }[],
  procedures: { id: string; frequencyPerDay: number; createdAt: string }[],
  today: Date,
): number {
  if (procedures.length === 0) return 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    const activeProcs = procedures.filter((p) => new Date(p.createdAt) <= d);
    if (activeProcs.length === 0) break;
    const allDone = activeProcs.every((p) => {
      const log = allLogs.find((l) => l.procedureId === p.id && l.date === key);
      return (log?.count ?? 0) >= p.frequencyPerDay;
    });
    if (allDone) streak++;
    else break;
  }
  return streak;
}

export default function DailyScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { profile } = useProfile();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDayKey = dayKey(selectedDate);
  const stripRef = useRef<ScrollView>(null);

  const { procedures } = useProcedures();
  const { logs, allLogs, tickProcedure } = useProcedureLogs(selectedDayKey);
  const { photos, addPhoto } = usePhotos();
  const { journal } = useJournal();

  const dayPhotos = photos.filter((p) => p.date === selectedDayKey);
  const dayJournal = journal.filter((j) => j.date === selectedDayKey);

  const strip = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -15; i <= 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today]);

  const completionToday = useMemo(() => {
    if (procedures.length === 0) return { done: 0, total: 0 };
    let done = 0;
    let total = 0;
    for (const p of procedures) {
      total += p.frequencyPerDay;
      const log = logs.find((l) => l.procedureId === p.id);
      done += Math.min(log?.count ?? 0, p.frequencyPerDay);
    }
    return { done, total };
  }, [procedures, logs]);

  const streak = useMemo(
    () => computeStreak(allLogs, procedures, today),
    [allLogs, procedures, today],
  );

  const launchPicker = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Нет разрешения',
        source === 'camera'
          ? 'Разрешите доступ к камере в настройках.'
          : 'Разрешите доступ к фотогалерее в настройках.',
      );
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, exif: false })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: false,
            exif: false,
          });
    if (result.canceled) return;
    const asset = result.assets[0];
    const persisted = await persistPhoto(asset.uri);
    await addPhoto({
      uri: persisted.uri,
      date: selectedDayKey,
      zone: 'other',
      width: asset.width,
      height: asset.height,
    });
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Добавить фото',
      'Откуда взять снимок?',
      [
        { text: 'Сделать снимок', onPress: () => launchPicker('camera') },
        { text: 'Выбрать из галереи', onPress: () => launchPicker('library') },
        { text: 'Отмена', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const handleAddProcedure = () => router.push('/treatment-form');
  const handleAddJournal = () =>
    router.push({ pathname: '/journal-form', params: { date: selectedDayKey } });

  const greeting = useMemo(() => {
    const h = today.getHours();
    if (h < 5) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  }, [today]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
        {/* Greeting header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: palette.textMuted }]}>
              {greeting}
            </Text>
            <Text style={[styles.headerTitle, { color: palette.text }]}>
              {dayOfTreatment(profile.startDate, today)}-й день лечения
            </Text>
          </View>
          <BrandMark size={44} shape="tile" borderRadius={22} />
        </View>

        {/* Month picker */}
        <View style={styles.monthRow}>
          <Text style={[styles.monthText, { color: palette.text }]}>
            {RU_MONTHS[selectedDate.getMonth()]}{' '}
          </Text>
          <Text style={[styles.monthTextMuted, { color: palette.textMuted }]}>
            {selectedDate.getFullYear()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={palette.textMuted}
            style={{ marginLeft: 6 }}
          />
        </View>

        {/* Day strip — centers today's cell on first layout */}
        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
          onLayout={(e) => {
            const viewportW = e.nativeEvent.layout.width;
            // Cells are DAY_CELL_WIDTH + gap (see styles.stripContent). Today is the 16th cell (index 15).
            const offset =
              15 * (DAY_CELL_WIDTH + DAY_CELL_GAP) +
              DAY_CELL_WIDTH / 2 -
              viewportW / 2 +
              Spacing.lg;
            stripRef.current?.scrollTo({ x: Math.max(0, offset), animated: false });
          }}>
          {strip.map((d) => {
            const isSelected = isSameDay(d, selectedDate);
            const isToday = isSameDay(d, today);
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => setSelectedDate(new Date(d))}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: isSelected ? palette.accent : palette.surfaceElevated,
                    borderColor: isSelected
                      ? palette.accent
                      : isToday
                        ? palette.accent
                        : palette.border,
                    borderWidth: isSelected ? 0 : isToday ? 1.5 : 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.dayLabel,
                    { color: isSelected ? '#FFF' : palette.textMuted },
                  ]}>
                  {weekdayShort(d)}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: isSelected
                        ? '#FFF'
                        : isToday
                          ? palette.accent
                          : palette.text,
                    },
                  ]}>
                  {d.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              Shadows.sm,
              { backgroundColor: palette.surfaceElevated },
            ]}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color={palette.accent}
              />
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
                Сегодня
              </Text>
            </View>
            <Text style={[styles.statValue, { color: palette.text }]}>
              {completionToday.done}
              <Text style={[styles.statValueMuted, { color: palette.textMuted }]}>
                {' '}/ {completionToday.total}
              </Text>
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              Shadows.sm,
              { backgroundColor: palette.surfaceElevated },
            ]}>
            <View style={styles.statHeader}>
              <MaterialCommunityIcons
                name="fire"
                size={18}
                color={palette.secondary}
              />
              <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
                Серия
              </Text>
            </View>
            <Text style={[styles.statValue, { color: palette.text }]}>
              {streak}
              <Text style={[styles.statValueMuted, { color: palette.textMuted }]}>
                {' '}{streak === 1 ? 'день' : streak >= 2 && streak <= 4 ? 'дня' : 'дней'}
              </Text>
            </Text>
          </View>
        </View>

        {/* Procedures card */}
        <View
          style={[
            styles.sectionCard,
            Shadows.sm,
            { backgroundColor: palette.surfaceElevated },
          ]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="pill"
                size={18}
                color={palette.accent}
              />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Процедуры
              </Text>
            </View>
            <Pressable
              onPress={handleAddProcedure}
              style={[styles.addBtn, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="add" size={18} color={palette.accent} />
            </Pressable>
          </View>

          {procedures.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Нажмите «+», чтобы добавить первую процедуру (миноксидил, финастерид и т.д.).
            </Text>
          ) : (
            procedures.map((p, idx) => {
              const log = logs.find((l) => l.procedureId === p.id);
              const done = log?.count ?? 0;
              const meta = PROCEDURE_KIND_META[p.kind];
              const complete = done >= p.frequencyPerDay;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => tickProcedure(p.id, selectedDayKey)}
                  style={[
                    styles.procedureRow,
                    idx < procedures.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: palette.border,
                    },
                  ]}>
                  <View
                    style={[
                      styles.procedureIcon,
                      {
                        backgroundColor: complete ? palette.accentSoft : palette.surface,
                      },
                    ]}>
                    <MaterialCommunityIcons
                      name={meta.icon as any}
                      size={20}
                      color={complete ? palette.accent : palette.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.procedureName, { color: palette.text }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.procedureMeta, { color: palette.textSecondary }]}>
                      {p.amount} {p.unit}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {Array.from({ length: p.frequencyPerDay }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              i < done ? palette.accent : 'transparent',
                            borderColor:
                              i < done ? palette.accent : palette.borderStrong,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Photos card */}
        <View
          style={[
            styles.sectionCard,
            Shadows.sm,
            { backgroundColor: palette.surfaceElevated },
          ]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="camera-outline"
                size={18}
                color={palette.accent}
              />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Фотографии
              </Text>
            </View>
            <Pressable
              onPress={handleAddPhoto}
              style={[styles.addBtn, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="add" size={18} color={palette.accent} />
            </Pressable>
          </View>
          {dayPhotos.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Нажмите «+», чтобы добавить сегодняшние фото прогресса.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {dayPhotos.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() =>
                      router.push({ pathname: '/photo-detail', params: { id: p.id } })
                    }>
                    <Image
                      source={{ uri: p.uri }}
                      style={styles.photoThumb}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Journal card */}
        <View
          style={[
            styles.sectionCard,
            Shadows.sm,
            { backgroundColor: palette.surfaceElevated },
          ]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="notebook-outline"
                size={18}
                color={palette.accent}
              />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Журнал
              </Text>
            </View>
            <Pressable
              onPress={handleAddJournal}
              style={[styles.addBtn, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="add" size={18} color={palette.accent} />
            </Pressable>
          </View>
          {dayJournal.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Нажмите «+», чтобы записать заметки за сегодня.
            </Text>
          ) : (
            dayJournal.map((entry, idx) => (
              <Pressable
                key={entry.id}
                onPress={() =>
                  router.push({ pathname: '/journal-form', params: { id: entry.id } })
                }
                style={[
                  styles.journalRow,
                  idx < dayJournal.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: palette.border,
                  },
                ]}>
                {entry.text ? (
                  <Text
                    style={[styles.journalText, { color: palette.text }]}
                    numberOfLines={3}>
                    {entry.text}
                  </Text>
                ) : null}
                {entry.symptoms && entry.symptoms.length > 0 && (
                  <Text
                    style={[styles.journalSymptoms, { color: palette.textSecondary }]}>
                    {entry.symptoms.join(' · ')}
                  </Text>
                )}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  monthText: { fontSize: 17, fontWeight: '600' },
  monthTextMuted: { fontSize: 17, fontWeight: '400' },

  stripContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  dayCell: {
    width: 48,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: 2,
  },
  dayLabel: { fontSize: 12, fontWeight: '500' },
  dayNum: { fontSize: 17, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 6,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: { fontSize: 13, fontWeight: '500' },
  statValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  statValueMuted: { fontSize: 16, fontWeight: '500' },

  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: Spacing.sm,
  },

  procedureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  procedureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  procedureName: { fontSize: 16, fontWeight: '600' },
  procedureMeta: { fontSize: 13, marginTop: 2 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },

  photoRow: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.sm },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: Radius.md,
  },

  journalRow: { paddingVertical: Spacing.sm },
  journalText: { fontSize: 15, lineHeight: 21 },
  journalSymptoms: { marginTop: 6, fontSize: 12, fontWeight: '500' },
});

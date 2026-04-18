import React, { useMemo, useState } from 'react';
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

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useJournal,
  usePhotos,
  useProcedureLogs,
  useProcedures,
} from '@/contexts/data-context';
import { dayKey } from '@/lib/uuid';
import { persistPhoto } from '@/lib/photos';
import { PROCEDURE_KIND_META } from '@/lib/types';

const RU_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const RU_WEEKDAY_MON_FIRST = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function getDayLabel(date: Date, today: Date): string {
  if (isSameDay(date, today)) return 'Сегод…';
  const dow = date.getDay();
  const monIdx = (dow + 6) % 7;
  return RU_WEEKDAY_MON_FIRST[monIdx];
}

export default function DailyScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDayKey = dayKey(selectedDate);

  const { procedures } = useProcedures();
  const { logs, tickProcedure } = useProcedureLogs(selectedDayKey);
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
        ? await ImagePicker.launchCameraAsync({
            quality: 0.8,
            exif: false,
          })
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

  const handleAddProcedure = () => {
    router.push('/treatment-form');
  };

  const handleAddJournal = () => {
    router.push({ pathname: '/journal-form', params: { date: selectedDayKey } });
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* Month picker */}
        <View style={styles.monthRow}>
          <Text style={[styles.monthName, { color: palette.accent }]}>
            {RU_MONTHS[selectedDate.getMonth()]}{' '}
          </Text>
          <Text style={[styles.monthYear, { color: palette.accent }]}>
            {selectedDate.getFullYear()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={palette.accent}
            style={{ marginLeft: 6 }}
          />
        </View>

        {/* Day strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}>
          {strip.map((d) => {
            const isSelected = isSameDay(d, selectedDate);
            const isToday = isSameDay(d, today);
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => setSelectedDate(new Date(d))}
                style={styles.dayCell}>
                <Text style={[styles.dayNum, { color: palette.text }]}>{d.getDate()}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    {
                      borderColor: isSelected ? palette.accent : palette.border,
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: palette.surface,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.dayLabel,
                    { color: isToday ? palette.accent : palette.textSecondary },
                  ]}>
                  {getDayLabel(d, today)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Big blue panel */}
        <View style={[styles.bluePanel, { backgroundColor: palette.accent }]}>
          {/* Procedures */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleWhite}>Процедуры</Text>
            <Pressable style={styles.plusBtn} onPress={handleAddProcedure}>
              <Ionicons name="add" size={22} color="#FFF" />
            </Pressable>
          </View>

          {procedures.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Нажмите «плюс», чтобы добавить первую процедуру (миноксидил, финастерид и т.д.).
              </Text>
            </View>
          ) : (
            procedures.map((p) => {
              const log = logs.find((l) => l.procedureId === p.id);
              const done = log?.count ?? 0;
              const meta = PROCEDURE_KIND_META[p.kind];
              return (
                <Pressable
                  key={p.id}
                  onPress={() => tickProcedure(p.id, selectedDayKey)}
                  style={styles.itemCard}>
                  <View style={[styles.itemIcon, { backgroundColor: '#FFF' }]}>
                    <MaterialCommunityIcons
                      name={meta.icon as any}
                      size={22}
                      color="#1A1A1A"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{p.name}</Text>
                    <Text style={styles.itemSubtitle}>
                      {p.amount} {p.unit}
                    </Text>
                  </View>
                  <View style={styles.checkRow}>
                    {Array.from({ length: p.frequencyPerDay }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.checkCircle,
                          {
                            borderColor: '#1A1A1A',
                            backgroundColor: i < done ? '#1A1A1A' : 'transparent',
                          },
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })
          )}

          <View style={styles.divider} />

          {/* Photos */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleWhite}>Фотографии</Text>
            <Pressable style={styles.plusBtn} onPress={handleAddPhoto}>
              <Ionicons name="add" size={22} color="#FFF" />
            </Pressable>
          </View>
          {dayPhotos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Нажмите «плюс», чтобы добавить сегодняшние фото прогресса.
              </Text>
            </View>
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

          <View style={styles.divider} />

          {/* Journal */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleWhite}>Журнал</Text>
            <Pressable style={styles.plusBtn} onPress={handleAddJournal}>
              <Ionicons name="add" size={22} color="#FFF" />
            </Pressable>
          </View>
          {dayJournal.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Нажмите «плюс», чтобы записать заметки за сегодня.
              </Text>
            </View>
          ) : (
            dayJournal.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() =>
                  router.push({ pathname: '/journal-form', params: { id: entry.id } })
                }
                style={styles.journalCard}>
                <Text style={styles.journalText} numberOfLines={4}>
                  {entry.text}
                </Text>
                {entry.symptoms && entry.symptoms.length > 0 && (
                  <Text style={styles.journalSymptoms}>
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
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  monthName: { fontSize: 28, fontWeight: '700' },
  monthYear: { fontSize: 28, fontWeight: '400' },
  stripContent: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  dayCell: { alignItems: 'center', width: 52 },
  dayNum: { fontSize: 16, fontWeight: '500', marginBottom: 6 },
  dayCircle: { width: 44, height: 44, borderRadius: 22, marginBottom: 6 },
  dayLabel: { fontSize: 13, fontWeight: '500' },
  bluePanel: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitleWhite: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontSize: 17, fontWeight: '600', color: '#11181C' },
  itemSubtitle: { fontSize: 14, color: '#6B6F76', marginTop: 2 },
  checkRow: { flexDirection: 'row', gap: Spacing.sm },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: Spacing.lg,
  },
  emptyCard: { backgroundColor: '#F2F2F7', borderRadius: Radius.lg, padding: Spacing.lg },
  emptyText: { fontSize: 15, color: '#11181C', lineHeight: 21 },
  photoRow: { flexDirection: 'row', gap: Spacing.sm },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    backgroundColor: '#FFF',
  },
  journalCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  journalText: { fontSize: 15, color: '#11181C', lineHeight: 21 },
  journalSymptoms: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B6F76',
  },
});

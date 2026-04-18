import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const RU_MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
// Russian short letters Mon..Sun: Пн Вт Ср Чт Пт Сб Вс
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
  const dow = date.getDay(); // 0 Sun..6 Sat
  const monIdx = (dow + 6) % 7; // 0 Mon..6 Sun
  return RU_WEEKDAY_MON_FIRST[monIdx];
}

type Procedure = {
  id: string;
  name: string;
  dose: string;
  frequencyPerDay: number;
  doneToday: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export default function DailyScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  // Pinned to today's date from the userContext (2026-04-19) so the demo matches the screenshots.
  const today = useMemo(() => new Date(2026, 3, 19), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Build calendar strip ±15 days
  const strip = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -15; i <= 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today]);

  const [procedures, setProcedures] = useState<Procedure[]>([
    {
      id: '1',
      name: 'Миноксидил',
      dose: '10 распыления',
      frequencyPerDay: 2,
      doneToday: 0,
      icon: 'spray-bottle',
    },
  ]);

  const tickProcedure = (id: string) => {
    setProcedures((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, doneToday: p.doneToday >= p.frequencyPerDay ? 0 : p.doneToday + 1 }
          : p,
      ),
    );
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
            <Pressable style={styles.plusBtn}>
              <Ionicons name="add" size={22} color="#FFF" />
            </Pressable>
          </View>

          {procedures.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => tickProcedure(p.id)}
              style={styles.itemCard}>
              <View style={[styles.itemIcon, { backgroundColor: '#FFF' }]}>
                <MaterialCommunityIcons name={p.icon} size={22} color="#1A1A1A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{p.name}</Text>
                <Text style={styles.itemSubtitle}>{p.dose}</Text>
              </View>
              <View style={styles.checkRow}>
                {Array.from({ length: p.frequencyPerDay }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: '#1A1A1A',
                        backgroundColor: i < p.doneToday ? '#1A1A1A' : 'transparent',
                      },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          ))}

          <View style={styles.divider} />

          {/* Photos */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleWhite}>Фотографии</Text>
            <Pressable style={styles.plusBtn}>
              <Ionicons name="add" size={22} color="#FFF" />
            </Pressable>
          </View>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Нажмите кнопку «плюс», чтобы добавить сегодняшние фото прогресса.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Journal */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleWhite}>Журнал</Text>
            <Pressable style={styles.plusBtn}>
              <Ionicons name="add" size={22} color="#FFF" />
            </Pressable>
          </View>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Нажмите кнопку «плюс», чтобы записать заметки за сегодня.
            </Text>
          </View>
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
  monthName: {
    fontSize: 28,
    fontWeight: '700',
  },
  monthYear: {
    fontSize: 28,
    fontWeight: '400',
  },
  stripContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dayCell: {
    alignItems: 'center',
    width: 52,
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
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
  sectionTitleWhite: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
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
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#11181C',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6B6F76',
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: Spacing.lg,
  },
  emptyCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  emptyText: {
    fontSize: 15,
    color: '#11181C',
    lineHeight: 21,
  },
});

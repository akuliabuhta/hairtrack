import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProcedures, useProfile } from '@/contexts/data-context';
import {
  GOAL_META,
  PROCEDURE_KIND_META,
  type Goal,
  type ProcedureKind,
} from '@/lib/types';
import { showAlert } from '@/lib/alert';

// Order matters — 'lotion' first because it's the common starting point
// (many Vikinord-style treatments are lotions).
const KIND_ORDER: ProcedureKind[] = [
  'lotion',
  'spray',
  'pill',
  'oil',
  'shampoo',
  'derma-roller',
  'massage',
  'other',
];

const FREQUENCY_PRESETS = [1, 2, 3, 4];

function isValidTime(t: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t.trim());
}

function normalizeTime(t: string): string {
  const [h, m] = t.split(':');
  return `${String(Number(h)).padStart(2, '0')}:${String(Number(m)).padStart(2, '0')}`;
}

export default function TreatmentForm() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { procedures, addProcedure, updateProcedure, deleteProcedure } = useProcedures();
  const { profile } = useProfile();

  const editing = useMemo(
    () => (id ? procedures.find((p) => p.id === id) : undefined),
    [id, procedures],
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [kinds, setKinds] = useState<ProcedureKind[]>(
    editing?.kinds && editing.kinds.length > 0 ? editing.kinds : ['lotion'],
  );
  const [amountStr, setAmountStr] = useState(String(editing?.amount ?? 10));
  const [unit, setUnit] = useState(
    editing?.unit ?? PROCEDURE_KIND_META[kinds[0] ?? 'lotion'].defaultUnit,
  );
  const [frequency, setFrequency] = useState(editing?.frequencyPerDay ?? 2);
  const [times, setTimes] = useState<string[]>(editing?.reminderTimes ?? ['09:00', '21:00']);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [newTime, setNewTime] = useState('');
  // Prefill zones from onboarding goals so the common case (same as the
  // user's declared growth targets) is a single tap away. They can still
  // override per procedure.
  const [targetZones, setTargetZones] = useState<Goal[]>(
    editing?.targetZones ?? profile.goals ?? [],
  );

  const toggleZone = (z: Goal) => {
    setTargetZones((prev) =>
      prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z],
    );
  };

  // When the primary kind changes (and the user hasn't typed a custom unit),
  // swap in the matching default unit.
  useEffect(() => {
    if (!editing && kinds[0]) setUnit(PROCEDURE_KIND_META[kinds[0]].defaultUnit);
  }, [kinds, editing]);

  const toggleKind = (k: ProcedureKind) => {
    setKinds((prev) => {
      if (prev.includes(k)) {
        // Can't deselect the last one — at least one kind must remain.
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== k);
      }
      return [...prev, k];
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Введите название', 'Например: «Миноксидил» или «Vikinord 15%».');
      return;
    }
    const amount = Number(amountStr.replace(',', '.'));
    if (!amount || amount <= 0) {
      showAlert('Введите дозу', 'Например: 5 капель, 1 мг, 10 распылений.');
      return;
    }
    const validTimes = times.filter(isValidTime).map(normalizeTime);
    const payload = {
      name: name.trim(),
      kinds,
      targetZones,
      amount,
      unit: unit.trim() || PROCEDURE_KIND_META[kinds[0] ?? 'other'].defaultUnit,
      frequencyPerDay: frequency,
      reminderTimes: validTimes,
      notes: notes.trim() || undefined,
    };
    if (editing) {
      await updateProcedure(editing.id, payload);
    } else {
      await addProcedure(payload);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!editing) return;
    showAlert('Удалить лечение?', 'Также удалится история отметок.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteProcedure(editing.id);
          router.back();
        },
      },
    ]);
  };

  const handleAddTime = () => {
    const t = newTime.trim();
    if (!isValidTime(t)) {
      showAlert('Неверное время', 'Используйте формат ЧЧ:ММ, например 09:30.');
      return;
    }
    const norm = normalizeTime(t);
    if (times.includes(norm)) {
      setNewTime('');
      return;
    }
    setTimes([...times, norm].sort());
    setNewTime('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen options={{ title: editing ? 'Изменить' : 'Новое лечение' }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Name */}
        <Text style={[styles.label, { color: palette.text }]}>Название</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Миноксидил, Vikinord 15%, дермароллер…"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            { backgroundColor: palette.surface, color: palette.text },
          ]}
        />

        {/* Kind — multi-select: can combine (e.g. lotion + dermaroller) */}
        <Text style={[styles.label, { color: palette.text }]}>Тип</Text>
        <Text style={[styles.hint, { color: palette.textMuted }]}>
          Можно выбрать несколько (например лосьон + дермароллер)
        </Text>
        <View style={styles.kindGrid}>
          {KIND_ORDER.map((k) => {
            const meta = PROCEDURE_KIND_META[k];
            const selected = kinds.includes(k);
            return (
              <Pressable
                key={k}
                onPress={() => toggleKind(k)}
                style={[
                  styles.kindCell,
                  {
                    backgroundColor: selected ? palette.accent : palette.surface,
                    borderColor: selected ? palette.accent : palette.border,
                  },
                ]}>
                <MaterialCommunityIcons
                  name={meta.icon as any}
                  size={20}
                  color={selected ? '#FFF' : palette.text}
                />
                <Text
                  style={[
                    styles.kindLabel,
                    { color: selected ? '#FFF' : palette.text },
                  ]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Amount + unit */}
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: palette.text }]}>Доза</Text>
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              placeholder="10"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                { backgroundColor: palette.surface, color: palette.text },
              ]}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={[styles.label, { color: palette.text }]}>Единица</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder={PROCEDURE_KIND_META[kinds[0] ?? 'other'].defaultUnit}
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                { backgroundColor: palette.surface, color: palette.text },
              ]}
            />
          </View>
        </View>

        {/* Target zones — where on the body this treatment is applied */}
        <Text style={[styles.label, { color: palette.text }]}>Зоны применения</Text>
        <Text style={[styles.hint, { color: palette.textMuted }]}>
          На какой зоне используется это лечение. Можно несколько.
        </Text>
        <View style={styles.kindGrid}>
          {(Object.keys(GOAL_META) as Goal[]).map((z) => {
            const meta = GOAL_META[z];
            const selected = targetZones.includes(z);
            return (
              <Pressable
                key={z}
                onPress={() => toggleZone(z)}
                style={[
                  styles.kindCell,
                  {
                    backgroundColor: selected ? palette.accent : palette.surface,
                    borderColor: selected ? palette.accent : palette.border,
                  },
                ]}>
                <MaterialCommunityIcons
                  name={meta.icon as any}
                  size={20}
                  color={selected ? '#FFF' : palette.text}
                />
                <Text
                  style={[
                    styles.kindLabel,
                    { color: selected ? '#FFF' : palette.text },
                  ]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Frequency */}
        <Text style={[styles.label, { color: palette.text }]}>Раз в день</Text>
        <View style={styles.freqRow}>
          {FREQUENCY_PRESETS.map((n) => {
            const selected = n === frequency;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  setFrequency(n);
                  // Auto-suggest reminder times if none yet or count changed.
                  if (times.length !== n) {
                    const presets =
                      n === 1
                        ? ['09:00']
                        : n === 2
                          ? ['09:00', '21:00']
                          : n === 3
                            ? ['08:00', '14:00', '21:00']
                            : ['08:00', '12:00', '17:00', '22:00'];
                    setTimes(presets);
                  }
                }}
                style={[
                  styles.freqCell,
                  {
                    backgroundColor: selected ? palette.accent : palette.surface,
                  },
                ]}>
                <Text style={{ color: selected ? '#FFF' : palette.text, fontSize: 17, fontWeight: '600' }}>
                  {n}×
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reminder times */}
        <Text style={[styles.label, { color: palette.text }]}>Напоминания</Text>
        <View style={[styles.timesCard, { backgroundColor: palette.surface }]}>
          {times.length === 0 ? (
            <Text style={{ color: palette.textMuted, padding: Spacing.sm }}>
              Без напоминаний
            </Text>
          ) : (
            times.map((t) => (
              <View key={t} style={styles.timeChip}>
                <Ionicons name="alarm-outline" size={16} color={palette.accent} />
                <Text style={[styles.timeChipText, { color: palette.text }]}>{t}</Text>
                <Pressable
                  hitSlop={6}
                  onPress={() => setTimes(times.filter((x) => x !== t))}>
                  <Ionicons name="close" size={16} color={palette.textMuted} />
                </Pressable>
              </View>
            ))
          )}
          <View style={styles.addTimeRow}>
            <TextInput
              value={newTime}
              onChangeText={setNewTime}
              placeholder="ЧЧ:ММ"
              placeholderTextColor={palette.textMuted}
              keyboardType={Platform.OS === 'web' ? 'default' : 'numbers-and-punctuation'}
              maxLength={5}
              style={[
                styles.timeInput,
                { backgroundColor: palette.background, color: palette.text },
              ]}
              onSubmitEditing={handleAddTime}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleAddTime}
              style={[styles.addTimeBtn, { backgroundColor: palette.accent }]}>
              <Ionicons name="add" size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>

        {/* Notes */}
        <Text style={[styles.label, { color: palette.text }]}>Заметки</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Концентрация, способ применения, побочные эффекты…"
          placeholderTextColor={palette.textMuted}
          multiline
          numberOfLines={4}
          style={[
            styles.input,
            styles.textarea,
            { backgroundColor: palette.surface, color: palette.text },
          ]}
        />
      </ScrollView>

      {/* Fixed footer — the save button must always be reachable without
          scrolling. A tall form + hidden desktop scrollbars made it easy
          to miss that the CTA was below the fold. */}
      <View
        style={[
          styles.footer,
          { backgroundColor: palette.background, borderTopColor: palette.border },
        ]}>
        <PrimaryButton
          title={editing ? 'Сохранить изменения' : 'Добавить лечение'}
          onPress={handleSave}
        />
        {editing && (
          <Pressable onPress={handleDelete} style={styles.deleteRow}>
            <Ionicons name="trash-outline" size={20} color={palette.danger} />
            <Text style={[styles.deleteText, { color: palette.danger }]}>
              Удалить лечение
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  hint: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 17,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  kindGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kindCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  kindLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  freqRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  freqCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  timesCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderRadius: Radius.pill,
  },
  timeChipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  addTimeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  timeInput: {
    width: 90,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addTimeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

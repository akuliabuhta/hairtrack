import React, { useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJournal } from '@/contexts/data-context';
import { dayKey } from '@/lib/uuid';
import { SYMPTOMS_RU, type Mood } from '@/lib/types';
import { showAlert } from '@/lib/alert';

const MOODS: { id: Mood; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'good', label: 'Хорошо', icon: 'happy-outline' },
  { id: 'neutral', label: 'Норм', icon: 'remove-outline' },
  { id: 'bad', label: 'Плохо', icon: 'sad-outline' },
];

export default function JournalForm() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const { journal, upsertJournal, deleteJournal } = useJournal();

  const editing = useMemo(() => (id ? journal.find((j) => j.id === id) : undefined), [id, journal]);
  const targetDate = editing?.date ?? date ?? dayKey();

  const [text, setText] = useState(editing?.text ?? '');
  const [mood, setMood] = useState<Mood | undefined>(editing?.mood);
  const [symptoms, setSymptoms] = useState<string[]>(editing?.symptoms ?? []);

  const toggleSymptom = (sid: string) => {
    setSymptoms((prev) =>
      prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid],
    );
  };

  const handleSave = async () => {
    if (!text.trim() && symptoms.length === 0 && !mood) {
      showAlert('Пустая запись', 'Добавьте текст, симптомы или настроение.');
      return;
    }
    await upsertJournal({
      id: editing?.id,
      date: targetDate,
      text: text.trim(),
      mood,
      symptoms: symptoms.length ? symptoms : undefined,
    });
    router.back();
  };

  const handleDelete = () => {
    if (!editing) return;
    showAlert('Удалить запись?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteJournal(editing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen options={{ title: editing ? 'Запись' : 'Новая запись' }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.dateText, { color: palette.textSecondary }]}>
          {targetDate}
        </Text>

        <Text style={[styles.label, { color: palette.text }]}>Заметки</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Как сегодня? Что заметили? (выпадение, восстановление, побочные эффекты…)"
          placeholderTextColor={palette.textMuted}
          multiline
          style={[
            styles.input,
            { backgroundColor: palette.surface, color: palette.text },
          ]}
        />

        <Text style={[styles.label, { color: palette.text }]}>Настроение</Text>
        <View style={styles.moodRow}>
          {MOODS.map((m) => {
            const selected = mood === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMood(selected ? undefined : m.id)}
                style={[
                  styles.moodCell,
                  {
                    backgroundColor: selected ? palette.accent : palette.surface,
                  },
                ]}>
                <Ionicons
                  name={m.icon}
                  size={22}
                  color={selected ? '#FFF' : palette.text}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    { color: selected ? '#FFF' : palette.text },
                  ]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: palette.text }]}>Симптомы</Text>
        <View style={styles.chipsWrap}>
          {SYMPTOMS_RU.map((s) => {
            const selected = symptoms.includes(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggleSymptom(s.id)}
                style={[
                  styles.chip,
                  { backgroundColor: selected ? palette.accent : palette.surface },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? '#FFF' : palette.text },
                  ]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>

      {/* Sticky footer — see treatment-form for rationale. */}
      <View
        style={[
          styles.footer,
          { backgroundColor: palette.background, borderTopColor: palette.border },
        ]}>
        <PrimaryButton
          title={editing ? 'Сохранить' : 'Добавить запись'}
          onPress={handleSave}
        />
        {editing && (
          <Pressable onPress={handleDelete} style={styles.deleteRow}>
            <Ionicons name="trash-outline" size={20} color={palette.danger} />
            <Text style={[styles.deleteText, { color: palette.danger }]}>
              Удалить запись
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
  dateText: { fontSize: 15, marginBottom: Spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  moodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  moodCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    gap: 4,
  },
  moodLabel: { fontSize: 13, fontWeight: '500' },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  deleteText: { fontSize: 16, fontWeight: '600' },
});

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePhotos } from '@/contexts/data-context';
import { PHOTO_ZONE_META, type PhotoZone } from '@/lib/types';
import { showAlert } from '@/lib/alert';

const ZONE_ORDER: PhotoZone[] = [
  'crown',
  'hairline',
  'temples',
  'side',
  'beard',
  'brows',
  'other',
];

export default function PhotoDetail() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { photos, addPhoto, deletePhoto, resolveUri } = usePhotos();

  const photo = useMemo(() => photos.find((p) => p.id === id), [photos, id]);
  const [zone, setZone] = useState<PhotoZone>(photo?.zone ?? 'other');
  const [note, setNote] = useState(photo?.note ?? '');

  if (!photo) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.textSecondary }}>Фото не найдено.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    // Photos are append-only in our data model; if zone or note changed,
    // delete the old record and add a new one with the same uri but updated metadata.
    if (zone === photo.zone && (note ?? '') === (photo.note ?? '')) {
      router.back();
      return;
    }
    await addPhoto({
      uri: photo.uri,
      date: photo.date,
      zone,
      note: note.trim() || undefined,
      width: photo.width,
      height: photo.height,
    });
    await deletePhoto(photo.id);
    router.back();
  };

  const handleDelete = () => {
    showAlert('Удалить фото?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deletePhoto(photo.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen
        options={{
          title: 'Фото',
          headerRight: () => (
            <Pressable onPress={handleSave} hitSlop={8} style={{ paddingHorizontal: 8 }}>
              <Text style={{ color: palette.accent, fontSize: 17, fontWeight: '600' }}>
                Готово
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {(() => {
          const uri = resolveUri(photo);
          return (
            <Image
              source={uri ? { uri } : undefined}
              style={styles.image}
              contentFit="cover"
            />
          );
        })()}

        <View style={styles.body}>
          <Text style={[styles.dateText, { color: palette.textSecondary }]}>
            {photo.date}
          </Text>

          <Text style={[styles.label, { color: palette.text }]}>Зона</Text>
          <View style={styles.zoneGrid}>
            {ZONE_ORDER.map((z) => {
              const meta = PHOTO_ZONE_META[z];
              const selected = z === zone;
              return (
                <Pressable
                  key={z}
                  onPress={() => setZone(z)}
                  style={[
                    styles.zoneCell,
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
                      styles.zoneLabel,
                      { color: selected ? '#FFF' : palette.text },
                    ]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: palette.text }]}>Заметка</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Освещение, ракурс, состояние волос…"
            placeholderTextColor={palette.textMuted}
            multiline
            style={[
              styles.noteInput,
              { backgroundColor: palette.surface, color: palette.text },
            ]}
          />

          <Pressable onPress={handleDelete} style={styles.deleteRow}>
            <Ionicons name="trash-outline" size={20} color={palette.danger} />
            <Text style={[styles.deleteText, { color: palette.danger }]}>
              Удалить фото
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  body: {
    padding: Spacing.lg,
  },
  dateText: { fontSize: 15, marginBottom: Spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  zoneCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  zoneLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  noteInput: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

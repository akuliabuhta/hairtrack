import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { isStaticallyBrokenPhoto } from '@/lib/photos';
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
  const {
    photos,
    updatePhoto,
    deletePhoto,
    resolveUri,
    uploadingIds,
    uploadFailedIds,
    retryUpload,
  } = usePhotos();

  const photo = useMemo(() => photos.find((p) => p.id === id), [photos, id]);
  const [zone, setZone] = useState<PhotoZone>(photo?.zone ?? 'other');
  const [note, setNote] = useState(photo?.note ?? '');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  if (!photo) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.textSecondary }}>Фото не найдено.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (zone === photo.zone && (note ?? '') === (photo.note ?? '')) {
      router.back();
      return;
    }
    await updatePhoto(photo.id, { zone, note: note.trim() || undefined });
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
          const broken = isStaticallyBrokenPhoto(photo) || imageLoadFailed;
          const uploading = !broken && uploadingIds.has(photo.id);
          const uploadFailed =
            !broken && !uploading && uploadFailedIds.has(photo.id);
          if (broken) {
            return (
              <View
                style={[
                  styles.brokenHero,
                  { backgroundColor: palette.surface },
                ]}>
                <MaterialCommunityIcons
                  name="cloud-alert-outline"
                  size={56}
                  color={palette.warning}
                />
                <Text style={[styles.brokenTitle, { color: palette.text }]}>
                  Это фото не загрузилось в облако
                </Text>
                <Text style={[styles.brokenBody, { color: palette.textSecondary }]}>
                  Оригинал больше недоступен (например, его не добили в R2
                  из-за потери сети). Удалите запись ниже.
                </Text>
              </View>
            );
          }
          return (
            <View>
              <Image
                source={uri ? { uri } : undefined}
                style={styles.image}
                contentFit="cover"
                onError={() => setImageLoadFailed(true)}
              />
              {uploading && (
                <View style={styles.statusBanner}>
                  <ActivityIndicator color={palette.accentText} />
                  <Text style={[styles.statusText, { color: palette.accentText }]}>
                    Загружается в облако…
                  </Text>
                </View>
              )}
              {uploadFailed && (
                <View
                  style={[
                    styles.statusBanner,
                    { backgroundColor: palette.warning },
                  ]}>
                  <MaterialCommunityIcons
                    name="cloud-alert-outline"
                    size={16}
                    color={palette.accentText}
                  />
                  <Text style={[styles.statusText, { color: palette.accentText }]}>
                    Не удалось загрузить
                  </Text>
                  <Pressable onPress={() => retryUpload(photo.id)} hitSlop={8}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: palette.accentText, textDecorationLine: 'underline' },
                      ]}>
                      Повторить
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
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
  brokenHero: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  brokenTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  brokenBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  statusBanner: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    left: 20,
    right: 20,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
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

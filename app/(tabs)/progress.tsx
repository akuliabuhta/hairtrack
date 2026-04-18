import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BeforeAfterSlider } from '@/components/before-after-slider';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePhotos } from '@/contexts/data-context';
import { PHOTO_ZONE_META, type Photo, type PhotoZone } from '@/lib/types';

const SCREEN_W = Dimensions.get('window').width;
const NUM_COLS = 3;
const GUTTER = 6;
const TILE = (Math.min(SCREEN_W, 480) - Spacing.lg * 2 - GUTTER * (NUM_COLS - 1)) / NUM_COLS;

const ZONE_FILTERS: ('all' | PhotoZone)[] = [
  'all',
  'crown',
  'hairline',
  'temples',
  'side',
  'beard',
  'brows',
  'other',
];

function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = Math.abs(
    new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime(),
  );
  return Math.round(ms / 86_400_000);
}

export default function ProgressScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { photos } = usePhotos();
  const [zoneFilter, setZoneFilter] = useState<'all' | PhotoZone>('all');

  const filtered = useMemo(() => {
    const list = zoneFilter === 'all' ? photos : photos.filter((p) => p.zone === zoneFilter);
    // Sort newest first for grid; oldest first for "before/after" pair.
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [photos, zoneFilter]);

  const byOldest = useMemo(
    () => [...filtered].sort((a, b) => (a.date > b.date ? 1 : -1)),
    [filtered],
  );

  const beforePhoto: Photo | undefined = byOldest[0];
  const afterPhoto: Photo | undefined =
    byOldest[byOldest.length - 1]?.id !== beforePhoto?.id
      ? byOldest[byOldest.length - 1]
      : undefined;

  if (photos.length === 0) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safe, { backgroundColor: palette.background }]}>
        <View style={styles.center}>
          <Ionicons name="images-outline" size={92} color={palette.textMuted} />
          <Text style={[styles.title, { color: palette.textMuted }]}>Пока нет фото!</Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Добавьте фото в разделе «Ежедневно», и ваши фото прогресса появятся здесь.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        <Text style={[styles.heading, { color: palette.text }]}>Прогресс</Text>

        {/* Zone filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {ZONE_FILTERS.map((z) => {
            const isAll = z === 'all';
            const meta = isAll ? null : PHOTO_ZONE_META[z];
            const selected = z === zoneFilter;
            const label = isAll ? 'Все' : meta!.label;
            return (
              <Pressable
                key={z}
                onPress={() => setZoneFilter(z)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? palette.accent : palette.surface,
                  },
                ]}>
                {meta && (
                  <MaterialCommunityIcons
                    name={meta.icon as any}
                    size={14}
                    color={selected ? '#FFF' : palette.text}
                  />
                )}
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? '#FFF' : palette.text },
                  ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Before/After */}
        {beforePhoto && afterPhoto && (
          <View style={styles.compareCard}>
            <Text style={[styles.compareTitle, { color: palette.text }]}>
              До и после
            </Text>
            <Text style={[styles.compareMeta, { color: palette.textSecondary }]}>
              {beforePhoto.date} → {afterPhoto.date} · {diffDays(beforePhoto.date, afterPhoto.date)} дней
            </Text>
            <BeforeAfterSlider
              beforeUri={beforePhoto.uri}
              afterUri={afterPhoto.uri}
            />
          </View>
        )}

        {/* Grid */}
        <Text style={[styles.subheading, { color: palette.text }]}>Все фото</Text>
        <View style={styles.grid}>
          {filtered.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({ pathname: '/photo-detail', params: { id: p.id } })
              }
              style={styles.tileWrap}>
              <Image source={{ uri: p.uri }} style={styles.tile} contentFit="cover" />
              <View style={styles.tileBadge}>
                <Text style={styles.tileBadgeText}>{p.date.slice(5)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: { fontSize: 24, fontWeight: '700', marginTop: Spacing.lg },
  subtitle: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: Spacing.md },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  subheading: {
    fontSize: 19,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  compareCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  compareTitle: { fontSize: 19, fontWeight: '700', marginBottom: 4 },
  compareMeta: { fontSize: 14, marginBottom: Spacing.md },
  grid: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GUTTER,
  },
  tileWrap: { position: 'relative' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: Radius.md,
    backgroundColor: '#EEE',
  },
  tileBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
  },
  tileBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
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
import { isStaticallyBrokenPhoto } from '@/lib/photos';
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

/**
 * Broken check that also folds in runtime failures (storageKey is set
 * but the R2 object is actually missing — detected via <Image onError>).
 */
function isBrokenPhoto(p: Photo, runtimeFailedIds?: Set<string>): boolean {
  if (runtimeFailedIds?.has(p.id)) return true;
  return isStaticallyBrokenPhoto(p);
}

export default function ProgressScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { photos, resolveUri, uploadingIds, uploadFailedIds, retryUpload } = usePhotos();
  const [zoneFilter, setZoneFilter] = useState<'all' | PhotoZone>('all');
  // null = auto (oldest for "before", newest for "after").
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [picking, setPicking] = useState<'before' | 'after' | null>(null);
  // Photo IDs whose <Image> actually failed to load (e.g. R2 object
  // missing despite metadata claiming storageKey). Populated via onError.
  const [runtimeFailedIds, setRuntimeFailedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const markBroken = (id: string) =>
    setRuntimeFailedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    const list = zoneFilter === 'all' ? photos : photos.filter((p) => p.zone === zoneFilter);
    // Sort newest first for grid; oldest first for "before/after" pair.
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [photos, zoneFilter]);

  // Auto-pair skips broken photos — there's no image to show for them.
  const byOldestUsable = useMemo(
    () =>
      [...filtered]
        .filter((p) => !isBrokenPhoto(p, runtimeFailedIds))
        .sort((a, b) => (a.date > b.date ? 1 : -1)),
    [filtered, runtimeFailedIds],
  );

  // Drop manual selections that aren't in the current filter anymore.
  useEffect(() => {
    if (beforeId && !filtered.some((p) => p.id === beforeId)) setBeforeId(null);
    if (afterId && !filtered.some((p) => p.id === afterId)) setAfterId(null);
  }, [filtered, beforeId, afterId]);

  const autoBefore = byOldestUsable[0];
  const autoAfter =
    byOldestUsable[byOldestUsable.length - 1]?.id !== autoBefore?.id
      ? byOldestUsable[byOldestUsable.length - 1]
      : undefined;

  const beforePhoto: Photo | undefined =
    (beforeId && filtered.find((p) => p.id === beforeId)) || autoBefore;
  const afterPhoto: Photo | undefined =
    (afterId && filtered.find((p) => p.id === afterId)) ||
    (autoAfter && autoAfter.id !== beforePhoto?.id ? autoAfter : undefined);

  const isManual = beforeId !== null || afterId !== null;
  const resetPair = () => {
    setBeforeId(null);
    setAfterId(null);
  };

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
            <View style={styles.compareHeaderRow}>
              <Text style={[styles.compareTitle, { color: palette.text }]}>
                До и после
              </Text>
              {isManual && (
                <Pressable onPress={resetPair} hitSlop={8}>
                  <Text style={[styles.resetLink, { color: palette.accent }]}>
                    Сбросить
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.pairRow}>
              <Pressable
                onPress={() => setPicking('before')}
                style={[styles.pairPill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.pairLabel, { color: palette.textMuted }]}>До</Text>
                <View style={styles.pairDateRow}>
                  <Text style={[styles.pairDate, { color: palette.text }]}>
                    {beforePhoto.date}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={palette.textMuted} />
                </View>
              </Pressable>
              <MaterialCommunityIcons
                name="arrow-right"
                size={16}
                color={palette.textMuted}
              />
              <Pressable
                onPress={() => setPicking('after')}
                style={[styles.pairPill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.pairLabel, { color: palette.textMuted }]}>После</Text>
                <View style={styles.pairDateRow}>
                  <Text style={[styles.pairDate, { color: palette.text }]}>
                    {afterPhoto.date}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={palette.textMuted} />
                </View>
              </Pressable>
            </View>
            <Text style={[styles.compareMeta, { color: palette.textSecondary }]}>
              {diffDays(beforePhoto.date, afterPhoto.date)} дней между снимками
            </Text>
            <BeforeAfterSlider
              beforeUri={resolveUri(beforePhoto) ?? ''}
              afterUri={resolveUri(afterPhoto) ?? ''}
              onBeforeError={() => markBroken(beforePhoto.id)}
              onAfterError={() => markBroken(afterPhoto.id)}
            />
          </View>
        )}

        {/* Grid */}
        <Text style={[styles.subheading, { color: palette.text }]}>Все фото</Text>
        <View style={styles.grid}>
          {filtered.map((p) => {
            const uri = resolveUri(p);
            const broken = isBrokenPhoto(p, runtimeFailedIds);
            const uploading = !broken && uploadingIds.has(p.id);
            const uploadFailed =
              !broken && !uploading && uploadFailedIds.has(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({ pathname: '/photo-detail', params: { id: p.id } })
                }
                style={styles.tileWrap}>
                <Image
                  source={uri ? { uri } : undefined}
                  style={[styles.tile, { backgroundColor: palette.surface }]}
                  contentFit="cover"
                  onError={() => markBroken(p.id)}
                />
                {broken && (
                  <View
                    style={[
                      styles.brokenOverlay,
                      { backgroundColor: palette.surface },
                    ]}>
                    <MaterialCommunityIcons
                      name="cloud-alert-outline"
                      size={28}
                      color={palette.warning}
                    />
                    <Text style={[styles.brokenText, { color: palette.textSecondary }]}>
                      Не загружено
                    </Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.statusOverlay}>
                    <ActivityIndicator color={palette.accent} />
                  </View>
                )}
                {uploadFailed && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      retryUpload(p.id);
                    }}
                    style={[
                      styles.statusOverlay,
                      { backgroundColor: 'rgba(0,0,0,0.55)' },
                    ]}>
                    <MaterialCommunityIcons
                      name="cloud-refresh-outline"
                      size={24}
                      color={palette.accentText}
                    />
                    <Text style={[styles.retryText, { color: palette.accentText }]}>
                      Повторить
                    </Text>
                  </Pressable>
                )}
                <View style={styles.tileBadge}>
                  <Text style={styles.tileBadgeText}>{p.date.slice(5)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Pair picker modal */}
      <Modal
        visible={picking !== null}
        animationType="slide"
        onRequestClose={() => setPicking(null)}
        transparent={false}>
        <SafeAreaView
          edges={['top', 'left', 'right', 'bottom']}
          style={[styles.safe, { backgroundColor: palette.background }]}>
          <View style={styles.pickerHeader}>
            <Pressable onPress={() => setPicking(null)} hitSlop={8}>
              <Ionicons name="close" size={28} color={palette.text} />
            </Pressable>
            <Text style={[styles.pickerTitle, { color: palette.text }]}>
              {picking === 'before' ? 'Выбрать «До»' : 'Выбрать «После»'}
            </Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
            <View style={styles.grid}>
              {filtered.map((p) => {
                const uri = resolveUri(p);
                const broken = isBrokenPhoto(p, runtimeFailedIds);
                const currentId = picking === 'before' ? beforePhoto?.id : afterPhoto?.id;
                const isCurrent = p.id === currentId;
                const isOtherSide =
                  picking === 'before'
                    ? p.id === afterPhoto?.id
                    : p.id === beforePhoto?.id;
                const disabled = isOtherSide || broken;
                return (
                  <Pressable
                    key={p.id}
                    disabled={disabled}
                    onPress={() => {
                      if (picking === 'before') setBeforeId(p.id);
                      else setAfterId(p.id);
                      setPicking(null);
                    }}
                    style={[styles.tileWrap, disabled && { opacity: 0.3 }]}>
                    <Image
                      source={uri ? { uri } : undefined}
                      style={[
                        styles.tile,
                        { backgroundColor: palette.surface },
                        isCurrent && { borderColor: palette.accent, borderWidth: 3 },
                      ]}
                      contentFit="cover"
                      onError={() => markBroken(p.id)}
                    />
                    {broken && (
                      <View
                        style={[
                          styles.brokenOverlay,
                          { backgroundColor: palette.surface },
                        ]}>
                        <MaterialCommunityIcons
                          name="cloud-alert-outline"
                          size={28}
                          color={palette.warning}
                        />
                        <Text style={[styles.brokenText, { color: palette.textSecondary }]}>
                          Не загружено
                        </Text>
                      </View>
                    )}
                    <View style={styles.tileBadge}>
                      <Text style={styles.tileBadgeText}>{p.date.slice(5)}</Text>
                    </View>
                    {isCurrent && (
                      <View style={[styles.tileCheck, { backgroundColor: palette.accent }]}>
                        <Ionicons name="checkmark" size={14} color={palette.accentText} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  compareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  compareTitle: { fontSize: 19, fontWeight: '700' },
  compareMeta: { fontSize: 14, marginTop: Spacing.sm, marginBottom: Spacing.md },
  resetLink: { fontSize: 14, fontWeight: '600' },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pairPill: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 2,
  },
  pairLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pairDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  pairDate: { fontSize: 15, fontWeight: '600' },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700' },
  tileCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  brokenText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
  },
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

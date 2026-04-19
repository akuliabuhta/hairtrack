import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/auth-context';
import { usePhotos } from '@/contexts/data-context';
import { fetchAnalyses, runAiAnalysis } from '@/lib/ai-analyze';
import { showAlert } from '@/lib/alert';
import { PHOTO_ZONE_META, type Analysis } from '@/lib/types';

type Phase = 'landing' | 'pick' | 'analyzing' | 'result';

export default function AIAnalysisScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { user } = useAuth();
  const { photos, resolveUri } = usePhotos();

  // Only uploaded photos can participate — Claude fetches them from R2.
  const uploadedPhotos = useMemo(
    () => photos.filter((p) => !!p.storageKey),
    [photos],
  );

  const [phase, setPhase] = useState<Phase>('landing');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoadingHistory(true);
    const rows = await fetchAnalyses(user.id);
    setHistory(rows);
    setLoadingHistory(false);
  }, [user?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const startAnalysis = async () => {
    if (!user) {
      showAlert('Нужен аккаунт', 'Войдите, чтобы загружать фото в облако и запускать анализ.');
      return;
    }
    const selectedPhotos = selectedIds
      .map((id) => photos.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p && !!p.storageKey);
    const keys = selectedPhotos.map((p) => p.storageKey!);
    if (keys.length === 0) {
      showAlert('Нет подходящих фото', 'Выберите фото, которые уже загрузились в облако (с серым значком ✓).');
      return;
    }
    setPhase('analyzing');
    const res = await runAiAnalysis(keys);
    if (!res.ok) {
      setPhase('pick');
      showAlert('Не удалось выполнить анализ', res.reason);
      return;
    }
    setResult(res.analysis);
    setPhase('result');
    setHistory((prev) => [res.analysis, ...prev]);
  };

  const reset = () => {
    setSelectedIds([]);
    setResult(null);
    setPhase('landing');
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {phase === 'landing' && (
          <Landing
            palette={palette}
            onStart={() => setPhase('pick')}
            history={history}
            loadingHistory={loadingHistory}
            uploadedCount={uploadedPhotos.length}
            onOpenResult={(a) => {
              setResult(a);
              setPhase('result');
            }}
            needAuth={!user}
          />
        )}
        {phase === 'pick' && (
          <Picker
            palette={palette}
            photos={uploadedPhotos}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            resolveUri={resolveUri}
            onBack={() => setPhase('landing')}
            onStart={startAnalysis}
          />
        )}
        {phase === 'analyzing' && <Analyzing palette={palette} />}
        {phase === 'result' && result && (
          <Result palette={palette} analysis={result} onReset={reset} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Landing — pitch, start button, past analyses
// ---------------------------------------------------------------------------
function Landing({
  palette,
  onStart,
  history,
  loadingHistory,
  uploadedCount,
  onOpenResult,
  needAuth,
}: {
  palette: any;
  onStart: () => void;
  history: Analysis[];
  loadingHistory: boolean;
  uploadedCount: number;
  onOpenResult: (a: Analysis) => void;
  needAuth: boolean;
}) {
  const features = [
    { icon: 'grid', text: 'Тепловая карта плотности волос по зонам' },
    { icon: 'flower-outline', text: 'Плотность линии роста и рецессия висков' },
    { icon: 'person-outline', text: 'Высота лба и рецессия по боковому профилю' },
    { icon: 'options-outline', text: 'Асимметрия, самая слабая зона, общий health score' },
    { icon: 'clipboard-pulse-outline', text: 'Предполагаемая стадия Норвуда / Людвига + рекомендации' },
  ];

  return (
    <View>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="auto-fix" size={52} color={palette.accent} />
      </View>
      <Text style={[styles.title, { color: palette.text }]}>ИИ-анализ волос</Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Загрузи до 3 фото (лучше макушка, линия роста, боковой профиль). Модель Claude Sonnet 4.5
        вернёт структурированный отчёт.
      </Text>

      <View style={[styles.featureCard, { backgroundColor: palette.surface }]}>
        {features.map((f, i) => (
          <View
            key={i}
            style={[
              styles.featureRow,
              i < features.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: palette.border,
              },
            ]}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon as any} size={18} color={palette.accent} />
            </View>
            <Text style={[styles.featureText, { color: palette.text }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: Spacing.xl }} />
      <PrimaryButton
        title="Начать ИИ-анализ"
        onPress={onStart}
        disabled={uploadedCount === 0}
      />

      {uploadedCount === 0 && (
        <Text style={[styles.hintRow, { color: palette.textMuted }]}>
          Сначала добавь хотя бы одно фото на вкладке «Ежедневно» — оно должно загрузиться в облако.
        </Text>
      )}
      {needAuth && (
        <Text style={[styles.hintRow, { color: palette.textMuted }]}>
          Для ИИ-анализа нужен аккаунт — войди в «Настройках».
        </Text>
      )}

      {/* History */}
      <Text style={[styles.historyHeader, { color: palette.text }]}>История анализов</Text>
      {loadingHistory ? (
        <ActivityIndicator color={palette.accent} />
      ) : history.length === 0 ? (
        <Text style={[styles.emptyHistory, { color: palette.textMuted }]}>
          Пока пусто. После первого анализа результаты будут появляться здесь.
        </Text>
      ) : (
        history.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => onOpenResult(a)}
            style={[
              styles.historyCard,
              Shadows.sm,
              { backgroundColor: palette.surfaceElevated },
            ]}>
            <View style={styles.historyTop}>
              <Text style={[styles.historyDate, { color: palette.textSecondary }]}>
                {new Date(a.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <View style={[styles.scorePill, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.scorePillText, { color: palette.accent }]}>
                  {a.overallScore ?? '—'} / 100
                </Text>
              </View>
            </View>
            {a.summary && (
              <Text
                style={[styles.historySummary, { color: palette.text }]}
                numberOfLines={2}>
                {a.summary}
              </Text>
            )}
            <View style={styles.historyMeta}>
              {a.norwoodStage && (
                <Meta label="Норвуд" value={`${a.norwoodStage}`} palette={palette} />
              )}
              {a.ludwigStage && (
                <Meta label="Людвиг" value={`${a.ludwigStage}`} palette={palette} />
              )}
              {a.densityPct != null && (
                <Meta label="Плотность" value={`${a.densityPct}%`} palette={palette} />
              )}
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Picker — grid of uploaded photos, pick 1..3
// ---------------------------------------------------------------------------
function Picker({
  palette,
  photos,
  selectedIds,
  onToggle,
  resolveUri,
  onBack,
  onStart,
}: {
  palette: any;
  photos: import('@/lib/types').Photo[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  resolveUri: (p: any) => string | null;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <View>
      <Pressable onPress={onBack} style={styles.backRow}>
        <Ionicons name="chevron-back" size={22} color={palette.accent} />
        <Text style={{ color: palette.accent, fontSize: 17 }}>Назад</Text>
      </Pressable>

      <Text style={[styles.title, { color: palette.text, marginTop: Spacing.md }]}>
        Выберите до 3 фото
      </Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Оптимально: макушка, линия роста, боковой профиль. Выбрано: {selectedIds.length} / 3.
      </Text>

      <View style={{ height: Spacing.lg }} />

      {photos.length === 0 ? (
        <Text style={[styles.hintRow, { color: palette.textMuted }]}>
          Нет подходящих фото. Добавьте на вкладке «Ежедневно» и дождитесь, пока они загрузятся в облако.
        </Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => {
            const uri = resolveUri(p);
            const idx = selectedIds.indexOf(p.id);
            const selected = idx !== -1;
            return (
              <Pressable
                key={p.id}
                onPress={() => onToggle(p.id)}
                style={[styles.tile, selected && { borderColor: palette.accent, borderWidth: 3 }]}>
                <Image
                  source={uri ? { uri } : undefined}
                  style={styles.tileImg}
                  contentFit="cover"
                />
                {selected && (
                  <View style={[styles.tileBadge, { backgroundColor: palette.accent }]}>
                    <Text style={styles.tileBadgeText}>{idx + 1}</Text>
                  </View>
                )}
                <Text style={[styles.tileLabel, { color: palette.textMuted }]}>
                  {PHOTO_ZONE_META[p.zone]?.label ?? 'Фото'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ height: Spacing.xl }} />
      <PrimaryButton
        title={`Анализировать ${selectedIds.length} ${selectedIds.length === 1 ? 'фото' : 'фото'}`}
        onPress={onStart}
        disabled={selectedIds.length === 0}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Analyzing — spinner screen while waiting for Claude
// ---------------------------------------------------------------------------
function Analyzing({ palette }: { palette: any }) {
  return (
    <View style={styles.analyzingWrap}>
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={[styles.analyzingTitle, { color: palette.text }]}>
        Анализируем фото…
      </Text>
      <Text style={[styles.analyzingSub, { color: palette.textSecondary }]}>
        Это займёт 10–30 секунд. Модель смотрит снимки и формирует отчёт.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
function Result({
  palette,
  analysis,
  onReset,
}: {
  palette: any;
  analysis: Analysis;
  onReset: () => void;
}) {
  return (
    <View>
      <Pressable onPress={onReset} style={styles.backRow}>
        <Ionicons name="chevron-back" size={22} color={palette.accent} />
        <Text style={{ color: palette.accent, fontSize: 17 }}>Новый анализ</Text>
      </Pressable>

      <Text style={[styles.title, { color: palette.text, marginTop: Spacing.md }]}>
        Результат ИИ-анализа
      </Text>

      {/* Score hero */}
      <View
        style={[
          styles.scoreHero,
          Shadows.card,
          { backgroundColor: palette.surfaceElevated },
        ]}>
        <Text style={[styles.scoreLabel, { color: palette.textSecondary }]}>
          Общий показатель здоровья
        </Text>
        <Text style={[styles.scoreValue, { color: palette.accent }]}>
          {analysis.overallScore ?? '—'}
          <Text style={[styles.scoreValueMuted, { color: palette.textMuted }]}>
            {' '}/ 100
          </Text>
        </Text>
        {analysis.summary && (
          <Text style={[styles.scoreSummary, { color: palette.text }]}>
            {analysis.summary}
          </Text>
        )}
      </View>

      {/* Metrics grid */}
      <View style={styles.metricsGrid}>
        <MetricCard
          palette={palette}
          label="Стадия Норвуда"
          value={analysis.norwoodStage ? `${toRoman(analysis.norwoodStage)}` : '—'}
          hint="мужская шкала"
        />
        <MetricCard
          palette={palette}
          label="Стадия Людвига"
          value={analysis.ludwigStage ? `${toRoman(analysis.ludwigStage)}` : '—'}
          hint="женская шкала"
        />
        <MetricCard
          palette={palette}
          label="Плотность"
          value={analysis.densityPct != null ? `${analysis.densityPct}%` : '—'}
        />
        <MetricCard
          palette={palette}
          label="Асимметрия"
          value={analysis.asymmetryPct != null ? `${analysis.asymmetryPct}%` : '—'}
        />
        <MetricCard
          palette={palette}
          label="Слабая зона"
          value={
            analysis.weakZone
              ? PHOTO_ZONE_META[analysis.weakZone]?.label ?? analysis.weakZone
              : '—'
          }
        />
      </View>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <View style={[styles.recCard, Shadows.sm, { backgroundColor: palette.surfaceElevated }]}>
          <Text style={[styles.recTitle, { color: palette.text }]}>Рекомендации</Text>
          {analysis.recommendations.map((r, i) => (
            <View key={i} style={styles.recRow}>
              <View style={[styles.recBullet, { backgroundColor: palette.accent }]} />
              <Text style={[styles.recText, { color: palette.text }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.disclaimer, { color: palette.textMuted }]}>
        Не является медицинским диагнозом. Для постановки диагноза обратитесь к трихологу.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function MetricCard({
  palette,
  label,
  value,
  hint,
}: {
  palette: any;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={[styles.metricCard, Shadows.sm, { backgroundColor: palette.surfaceElevated }]}>
      <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
      {hint && (
        <Text style={[styles.metricHint, { color: palette.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

function Meta({ label, value, palette }: { label: string; value: string; palette: any }) {
  return (
    <View style={[styles.metaChip, { backgroundColor: palette.surface }]}>
      <Text style={[styles.metaChipLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.metaChipValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function toRoman(n: number): string {
  const map: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let v = n;
  for (const [num, sym] of map) {
    while (v >= num) {
      out += sym;
      v -= num;
    }
  }
  return out || `${n}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  iconWrap: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  featureCard: {
    marginTop: Spacing.xl,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20 },
  hintRow: {
    marginTop: Spacing.md,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  historyHeader: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  emptyHistory: { fontSize: 14, fontStyle: 'italic' },
  historyCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDate: { fontSize: 13, fontWeight: '500' },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  scorePillText: { fontSize: 12, fontWeight: '700' },
  historySummary: { fontSize: 14, lineHeight: 20, marginVertical: 4 },
  historyMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  metaChipLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metaChipValue: { fontSize: 12, fontWeight: '600' },

  // Picker
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#EEE',
  },
  tileImg: { width: '100%', height: '100%' },
  tileBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  tileLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // Analyzing
  analyzingWrap: {
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  analyzingTitle: { fontSize: 18, fontWeight: '700' },
  analyzingSub: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },

  // Result
  scoreHero: {
    marginTop: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  scoreLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValue: { fontSize: 64, fontWeight: '800', letterSpacing: -2, marginTop: 8 },
  scoreValueMuted: { fontSize: 22, fontWeight: '500' },
  scoreSummary: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  metricCard: {
    width: '47%',
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metricValue: { fontSize: 22, fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  metricHint: { fontSize: 10, marginTop: 2 },
  recCard: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  recTitle: { fontSize: 17, fontWeight: '700', marginBottom: Spacing.md },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  recBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  recText: { flex: 1, fontSize: 14, lineHeight: 20 },
  disclaimer: {
    marginTop: Spacing.xxl,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.lg,
    lineHeight: 16,
  },
});

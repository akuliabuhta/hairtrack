import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  type ArticleCategory,
} from '@/lib/articles';

export default function ArticlesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const [category, setCategory] = useState<ArticleCategory>('all');

  const list = useMemo(
    () =>
      category === 'all'
        ? ARTICLES
        : ARTICLES.filter((a) => a.category === category),
    [category],
  );

  const featured = ARTICLES[0];
  const rest = list.filter((a) => category !== 'all' || a.id !== featured.id);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Статьи</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Что известно науке о росте волос.
          </Text>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {ARTICLE_CATEGORIES.map((c) => {
            const selected = c.id === category;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? palette.accent : palette.surface,
                  },
                ]}>
                <MaterialCommunityIcons
                  name={c.icon as any}
                  size={14}
                  color={selected ? '#FFF' : palette.text}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? '#FFF' : palette.text },
                  ]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Featured (only when 'all' category) */}
        {category === 'all' && (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/article-detail', params: { id: featured.id } })
            }
            style={[
              styles.featuredCard,
              Shadows.sm,
              { backgroundColor: palette.surfaceElevated },
            ]}>
            <View style={[styles.featuredCover, { backgroundColor: featured.accent }]}>
              <Text style={styles.featuredEmoji}>{featured.emoji}</Text>
            </View>
            <View style={styles.featuredBody}>
              <Text style={[styles.featuredTag, { color: palette.accent }]}>
                РЕКОМЕНДУЕМ
              </Text>
              <Text style={[styles.featuredTitle, { color: palette.text }]}>
                {featured.title}
              </Text>
              <Text style={[styles.featuredExcerpt, { color: palette.textSecondary }]}>
                {featured.excerpt}
              </Text>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={13}
                  color={palette.textMuted}
                />
                <Text style={[styles.metaText, { color: palette.textMuted }]}>
                  {featured.readMinutes} мин чтения
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* List */}
        <View style={styles.listWrap}>
          {rest.map((a) => (
            <Pressable
              key={a.id}
              onPress={() =>
                router.push({ pathname: '/article-detail', params: { id: a.id } })
              }
              style={[
                styles.listCard,
                Shadows.sm,
                { backgroundColor: palette.surfaceElevated },
              ]}>
              <View style={[styles.listCover, { backgroundColor: a.accent }]}>
                <Text style={styles.listEmoji}>{a.emoji}</Text>
              </View>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <Text style={[styles.listCategory, { color: palette.accent }]}>
                  {(
                    ARTICLE_CATEGORIES.find((c) => c.id === a.category)?.label ?? ''
                  ).toUpperCase()}
                </Text>
                <Text
                  style={[styles.listTitle, { color: palette.text }]}
                  numberOfLines={2}>
                  {a.title}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={13}
                    color={palette.textMuted}
                  />
                  <Text style={[styles.metaText, { color: palette.textMuted }]}>
                    {a.readMinutes} мин
                  </Text>
                </View>
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 4 },
  chipsRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  featuredCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  featuredCover: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredEmoji: { fontSize: 64 },
  featuredBody: {
    padding: Spacing.lg,
  },
  featuredTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  featuredExcerpt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontSize: 12, fontWeight: '500' },
  listWrap: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  listCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  listCover: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmoji: { fontSize: 32 },
  listCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: Spacing.md,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 21,
    marginBottom: 6,
  },
});

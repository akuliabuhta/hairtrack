import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  findArticle,
  type ArticleBlock,
} from '@/lib/articles';

function Block({ block, palette }: { block: ArticleBlock; palette: any }) {
  if (block.type === 'h') {
    return (
      <Text style={[styles.h, { color: palette.text }]}>{block.text}</Text>
    );
  }
  if (block.type === 'p') {
    return (
      <Text style={[styles.p, { color: palette.text }]}>{block.text}</Text>
    );
  }
  if (block.type === 'li') {
    return (
      <View style={styles.liRow}>
        <View style={[styles.bullet, { backgroundColor: palette.accent }]} />
        <Text style={[styles.li, { color: palette.text }]}>{block.text}</Text>
      </View>
    );
  }
  if (block.type === 'note') {
    return (
      <View
        style={[
          styles.note,
          { backgroundColor: palette.accentSoft, borderLeftColor: palette.accent },
        ]}>
        <MaterialCommunityIcons
          name="information-outline"
          size={18}
          color={palette.accent}
          style={{ marginRight: 8, marginTop: 1 }}
        />
        <Text style={[styles.noteText, { color: palette.text }]}>
          {block.text}
        </Text>
      </View>
    );
  }
  return null;
}

export default function ArticleDetail() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const article = findArticle(id);

  if (!article) {
    return (
      <View style={[styles.missing, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.textSecondary }}>Статья не найдена.</Text>
      </View>
    );
  }

  const related = ARTICLES.filter(
    (a) => a.category === article.category && a.id !== article.id,
  ).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen
        options={{
          title:
            ARTICLE_CATEGORIES.find((c) => c.id === article.category)?.label ?? '',
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: article.accent }]}>
          <Text style={styles.heroEmoji}>{article.emoji}</Text>
        </View>

        <View style={styles.body}>
          <Text style={[styles.tag, { color: palette.accent }]}>
            {(
              ARTICLE_CATEGORIES.find((c) => c.id === article.category)?.label ?? ''
            ).toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: palette.text }]}>{article.title}</Text>
          <View style={styles.meta}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={palette.textMuted}
            />
            <Text style={[styles.metaText, { color: palette.textMuted }]}>
              {article.readMinutes} мин чтения
            </Text>
          </View>

          <Text style={[styles.excerpt, { color: palette.textSecondary }]}>
            {article.excerpt}
          </Text>

          <View style={styles.blocks}>
            {article.body.map((block, i) => (
              <Block key={i} block={block} palette={palette} />
            ))}
          </View>

          {related.length > 0 && (
            <>
              <Text style={[styles.relatedHeader, { color: palette.text }]}>
                Ещё по теме
              </Text>
              <View style={{ gap: Spacing.md }}>
                {related.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() =>
                      router.replace({ pathname: '/article-detail', params: { id: r.id } })
                    }
                    style={[
                      styles.relatedCard,
                      Shadows.sm,
                      { backgroundColor: palette.surfaceElevated },
                    ]}>
                    <View
                      style={[styles.relatedCover, { backgroundColor: r.accent }]}>
                      <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                    </View>
                    <Text
                      style={[styles.relatedTitle, { color: palette.text }]}
                      numberOfLines={2}>
                      {r.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 80 },
  body: {
    padding: Spacing.lg,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    marginBottom: Spacing.lg,
  },
  metaText: { fontSize: 12, fontWeight: '500' },
  excerpt: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: Spacing.lg,
  },
  blocks: { gap: Spacing.md },
  h: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: Spacing.md,
  },
  p: { fontSize: 16, lineHeight: 24 },
  liRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 10,
  },
  li: { flex: 1, fontSize: 16, lineHeight: 24 },
  note: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
  },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  relatedHeader: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  relatedCard: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    height: 64,
  },
  relatedCover: {
    width: 64,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedTitle: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
});

import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Feature = {
  icon: React.ReactNode;
  text: string;
};

export default function AIAnalysisScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const features: Feature[] = [
    {
      icon: <MaterialIcons name="grid-on" size={20} color={palette.accent} />,
      text: 'Тепловая карта кожи головы с плотностью волос и видимостью кожи',
    },
    {
      icon: <Ionicons name="flower-outline" size={20} color={palette.accent} />,
      text: 'Плотность линии роста волос и рецессия висков по крупному плану',
    },
    {
      icon: <Ionicons name="person-outline" size={20} color={palette.accent} />,
      text: 'Рецессия висков и высота лба по боковому профилю',
    },
    {
      icon: <Ionicons name="options-outline" size={20} color={palette.accent} />,
      text: 'Расширенные метрики: степень истончения, самая слабая зона, асимметрия, вогнутость',
    },
    {
      icon: (
        <MaterialCommunityIcons
          name="clipboard-pulse-outline"
          size={20}
          color={palette.accent}
        />
      ),
      text: 'Общий показатель здоровья и предполагаемая стадия Норвуда',
    },
  ];

  const handleStart = () => {
    Alert.alert(
      'Скоро в v1.1',
      'ИИ-анализ волос станет доступен в следующем обновлении приложения. Следите за новостями!',
      [{ text: 'Понятно', style: 'default' }],
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="auto-fix" size={56} color={palette.accent} />
        </View>

        <Text style={[styles.title, { color: palette.text }]}>
          ИИ-анализ волос
        </Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          Получите комплексный анализ состояния волос с помощью трёх обязательных фото.
        </Text>

        {/* Coming soon badge */}
        <View style={[styles.badge, { backgroundColor: palette.secondarySoft }]}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={palette.secondary} />
          <Text style={[styles.badgeText, { color: palette.secondary }]}>
            Скоро в v1.1
          </Text>
        </View>

        <View style={[styles.featureCard, { backgroundColor: palette.surface }]}>
          {features.map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureRow,
                i < features.length - 1 && styles.featureRowDivider,
                i < features.length - 1 && { borderBottomColor: palette.border },
              ]}>
              <View style={styles.featureIcon}>{f.icon}</View>
              <Text style={[styles.featureText, { color: palette.text }]}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: Spacing.xl }} />

        <PrimaryButton title="Начать ИИ-анализ" onPress={handleStart} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  iconWrap: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginTop: Spacing.lg,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  featureCard: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  featureRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureIcon: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});

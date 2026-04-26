import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SUPPORT_EMAIL = 'support@hairtrack.app';
const LAST_UPDATED = '2026-04-21';

export default function TermsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: 'Условия использования' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: palette.text }]}>
          Условия использования
        </Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>
          Последнее обновление: {LAST_UPDATED}
        </Text>

        <Section title="О приложении" palette={palette}>
          <P palette={palette}>
            HairTrack помогает отслеживать процедуры по уходу за волосами,
            фиксировать прогресс по фотографиям и получать ИИ-анализ. Это
            личный инструмент для самонаблюдения.
          </P>
        </Section>

        <Section title="Не медицинский совет" palette={palette}>
          <P palette={palette}>
            Информация и ИИ-анализ внутри приложения — <B>не диагноз</B> и
            не замена консультации трихолога или дерматолога. Решения о
            лечении (миноксидил, финастерид, дермароллер и т.п.) принимайте
            только после консультации с врачом.
          </P>
          <P palette={palette}>
            ИИ-модель оценивает фото статистически и может ошибаться. Используйте
            её результаты как ориентир, а не как руководство.
          </P>
        </Section>

        <Section title="Аккаунт и данные" palette={palette}>
          <P palette={palette}>
            • Вы отвечаете за конфиденциальность пароля и за то, какие
            фотографии и заметки добавляете.
          </P>
          <P palette={palette}>
            • Не загружайте фотографии других людей без их согласия.
          </P>
          <P palette={palette}>
            • Резервное копирование на стороне пользователя — экспортируйте
            данные через «Настройки» → «Экспорт данных», если они вам важны.
          </P>
        </Section>

        <Section title="Что нельзя" palette={palette}>
          <P palette={palette}>
            • Использовать приложение для незаконных целей или для нарушения
            прав других людей.
          </P>
          <P palette={palette}>
            • Пытаться обходить ограничения ИИ-анализа или нагружать систему
            автоматическими запросами.
          </P>
          <P palette={palette}>
            • Реверс-инжинирить, копировать код или интерфейс.
          </P>
        </Section>

        <Section title="Подписки и платежи" palette={palette}>
          <P palette={palette}>
            На текущем этапе приложение бесплатное. Если в будущем появится
            платная версия — мы предупредим заранее, и она не отнимет
            доступ к данным, которые вы уже создали.
          </P>
        </Section>

        <Section title="Прекращение работы сервиса" palette={palette}>
          <P palette={palette}>
            Мы можем приостановить или прекратить работу облачной части
            (синхронизация, ИИ-анализ) с уведомлением минимум за 30 дней.
            Локальные данные на вашем устройстве в этом случае остаются —
            вы сможете их экспортировать.
          </P>
        </Section>

        <Section title="Ограничение ответственности" palette={palette}>
          <P palette={palette}>
            Приложение предоставляется «как есть». Мы не отвечаем за решения,
            которые вы приняли на основании информации внутри приложения,
            включая результаты ИИ-анализа. Максимальная ответственность
            ограничена суммой, которую вы за приложение заплатили (ноль, если
            пользуетесь бесплатной версией).
          </P>
        </Section>

        <Section title="Изменения условий" palette={palette}>
          <P palette={palette}>
            При значительных изменениях мы обновим дату вверху и сообщим
            внутри приложения. Продолжение использования после уведомления
            означает согласие с обновлёнными условиями.
          </P>
        </Section>

        <Section title="Контакт" palette={palette}>
          <P palette={palette}>
            Вопросы и претензии:{' '}
            <Text
              style={{ color: palette.accent, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              {SUPPORT_EMAIL}
            </Text>
            .
          </P>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  palette,
  children,
}: {
  title: string;
  palette: typeof Colors.light;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.h2, { color: palette.text }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        {children}
      </View>
    </View>
  );
}

function P({
  palette,
  children,
}: {
  palette: typeof Colors.light;
  children: React.ReactNode;
}) {
  return <Text style={[styles.p, { color: palette.text }]}>{children}</Text>;
}

function B({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontWeight: '700' }}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  h2: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  p: {
    fontSize: 15,
    lineHeight: 22,
  },
});

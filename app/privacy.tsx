import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SUPPORT_EMAIL = 'support@hairtrack.app';
const LAST_UPDATED = '2026-04-21';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.safe, { backgroundColor: palette.background }]}>
      <Stack.Screen options={{ title: 'Конфиденциальность' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: palette.text }]}>
          Политика конфиденциальности
        </Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>
          Последнее обновление: {LAST_UPDATED}
        </Text>

        <Section title="Коротко" palette={palette}>
          <P palette={palette}>
            HairTrack — приложение для отслеживания процедур по волосам, фото
            прогресса и ИИ-анализа. Мы храним только то, что вы сами вводите,
            используем минимально необходимый набор облачных сервисов, не
            продаём данные и не показываем рекламу.
          </P>
        </Section>

        <Section title="Какие данные мы собираем" palette={palette}>
          <P palette={palette}>
            • <B>Аккаунт.</B> Email и хэш пароля, чтобы вы могли войти и
            синхронизировать прогресс между устройствами. Авторизация — через
            Supabase Auth.
          </P>
          <P palette={palette}>
            • <B>Процедуры и журнал.</B> Названия лечений, частота, заметки,
            настроение, теги симптомов — то, что вы вводите в формах
            «Лечение» и «Журнал».
          </P>
          <P palette={palette}>
            • <B>Фотографии.</B> Сами файлы и метаданные (дата, зона, заметка).
            Снимки сохраняются у вас на устройстве и копируются в облачное
            хранилище для синхронизации, если вы вошли в аккаунт.
          </P>
          <P palette={palette}>
            • <B>Результаты ИИ-анализа.</B> Только когда вы явно нажимаете
            «Начать ИИ-анализ» — мы отправляем выбранные 1–3 фото и получаем
            обратно структурированный отчёт.
          </P>
          <P palette={palette}>
            Мы <B>не</B> собираем геолокацию, не используем рекламные SDK и
            аналитику поведения, не получаем доступ к контактам, календарю
            или другим приложениям.
          </P>
        </Section>

        <Section title="Где хранятся данные" palette={palette}>
          <P palette={palette}>
            Если вы работаете без аккаунта — все данные остаются только на
            вашем устройстве (зашифрованное хранилище ОС). Когда вы входите в
            аккаунт, мы используем следующие сервисы как обработчиков
            данных:
          </P>
          <P palette={palette}>
            • <B>Supabase</B> (supabase.com) — база данных метаданных
            (процедуры, журнал, ссылки на фото, результаты анализа) и Auth.
            Данные хранятся в защищённом Postgres с RLS, доступны только
            вам по вашему JWT.
          </P>
          <P palette={palette}>
            • <B>Cloudflare R2</B> (cloudflare.com) — хранилище фото-файлов.
            Доступ к каждому файлу выдаётся по короткоживущей подписанной
            ссылке (1 час), привязанной к вашему аккаунту.
          </P>
          <P palette={palette}>
            • <B>Anthropic</B> (anthropic.com), модель Claude Sonnet — только
            в момент ИИ-анализа. Выбранные фото отправляются модели, она
            возвращает анализ, который сохраняется в Supabase. Anthropic
            не использует ваши данные для дообучения моделей в режиме API.
          </P>
        </Section>

        <Section title="Зачем" palette={palette}>
          <P palette={palette}>
            Чтобы приложение могло: показывать ваш прогресс между
            устройствами, напоминать о процедурах, проводить ИИ-анализ,
            сохранять журнал. Мы не используем ваши данные ни для каких
            других целей.
          </P>
        </Section>

        <Section title="Ваши права" palette={palette}>
          <P palette={palette}>
            • <B>Экспорт.</B> «Настройки» → «Экспорт данных» — выгрузите все
            ваши записи в JSON в любой момент.
          </P>
          <P palette={palette}>
            • <B>Удаление.</B> «Настройки» → «Сбросить все данные» — удалит
            все локальные данные и записи в облаке. Удаление аккаунта
            целиком — напишите на {SUPPORT_EMAIL}.
          </P>
          <P palette={palette}>
            • <B>Доступ и исправление.</B> Все ваши данные видны и редактируемы
            прямо в приложении.
          </P>
        </Section>

        <Section title="Срок хранения" palette={palette}>
          <P palette={palette}>
            Мы храним ваши данные пока вы пользуетесь приложением. После
            удаления аккаунта или нажатия «Сбросить все данные» записи
            удаляются из Supabase и R2 в течение 30 дней (стандартное окно
            на бэкапы).
          </P>
        </Section>

        <Section title="Дети" palette={palette}>
          <P palette={palette}>
            Приложение не рассчитано на пользователей младше 13 лет и мы
            не собираем сведения о таких пользователях намеренно.
          </P>
        </Section>

        <Section title="Изменения политики" palette={palette}>
          <P palette={palette}>
            При существенных изменениях мы обновим дату вверху и сообщим
            внутри приложения. Продолжение использования после уведомления
            означает согласие с обновлённой политикой.
          </P>
        </Section>

        <Section title="Контакт" palette={palette}>
          <P palette={palette}>
            По любым вопросам о ваших данных пишите на{' '}
            <Text
              style={{ color: palette.accent, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              {SUPPORT_EMAIL}
            </Text>
            . Мы отвечаем в течение 5 рабочих дней.
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

/**
 * 3-step onboarding the user sees on first launch:
 *  1. Welcome / value prop
 *  2. Pick gender
 *  3. Pick growth goals (head / beard / brows)
 *  4. Confirm and request notification permissions
 */

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/contexts/data-context';
import { GOAL_META, type Gender, type Goal } from '@/lib/types';
import { dayKey } from '@/lib/uuid';

const GENDERS: { id: Gender; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'male', label: 'Мужской', icon: 'gender-male' },
  { id: 'female', label: 'Женский', icon: 'gender-female' },
];

const STEPS = ['welcome', 'gender', 'goals', 'notify'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { updateProfile } = useProfile();

  const [step, setStep] = useState<Step>('welcome');
  const [gender, setGender] = useState<Gender | undefined>();
  const [goals, setGoals] = useState<Goal[]>([]);

  const stepIndex = STEPS.indexOf(step);
  const canContinue = useMemo(() => {
    if (step === 'gender') return !!gender;
    if (step === 'goals') return goals.length > 0;
    return true;
  }, [step, gender, goals]);

  const next = () => {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setStep(nextStep);
  };

  const finish = async (notificationsEnabled: boolean) => {
    await updateProfile({
      gender,
      goals,
      startDate: dayKey(),
      onboardingCompleted: true,
      notificationsEnabled,
    });
    router.replace('/(tabs)');
  };

  const toggleGoal = (g: Goal) => {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      {/* Step indicator */}
      <View style={styles.steps}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              {
                backgroundColor: i <= stepIndex ? palette.accent : palette.border,
                width: i === stepIndex ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'welcome' && (
          <>
            <View style={styles.iconWrap}>
              <BrandMark size={160} shape="tile" variant="full" />
            </View>
            <Text style={[styles.title, { color: palette.text }]}>Добро пожаловать в HairTrack</Text>
            <Text style={[styles.body, { color: palette.textSecondary }]}>
              Отслеживайте рост волос на голове, бороде и бровях по фото и
              расписанию процедур. Все данные хранятся локально на вашем устройстве.
            </Text>
          </>
        )}

        {step === 'gender' && (
          <>
            <Text style={[styles.title, { color: palette.text }]}>Ваш пол?</Text>
            <Text style={[styles.body, { color: palette.textSecondary }]}>
              Помогает подобрать персональные ориентиры — например, шкалу Норвуда для мужчин или Людвига для женщин.
            </Text>
            <View style={{ height: Spacing.xl }} />
            {GENDERS.map((g) => {
              const selected = gender === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGender(g.id)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: selected ? palette.accent : palette.surface,
                    },
                  ]}>
                  <MaterialCommunityIcons
                    name={g.icon}
                    size={24}
                    color={selected ? '#FFF' : palette.text}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: selected ? '#FFF' : palette.text },
                    ]}>
                    {g.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={22} color="#FFF" />}
                </Pressable>
              );
            })}
          </>
        )}

        {step === 'goals' && (
          <>
            <Text style={[styles.title, { color: palette.text }]}>Что отращиваете?</Text>
            <Text style={[styles.body, { color: palette.textSecondary }]}>
              Выберите одно или несколько направлений — экраны прогресса будут заточены под них.
            </Text>
            <View style={{ height: Spacing.xl }} />
            {(Object.keys(GOAL_META) as Goal[]).map((g) => {
              const meta = GOAL_META[g];
              const selected = goals.includes(g);
              return (
                <Pressable
                  key={g}
                  onPress={() => toggleGoal(g)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: selected ? palette.accent : palette.surface,
                    },
                  ]}>
                  <MaterialCommunityIcons
                    name={meta.icon as any}
                    size={24}
                    color={selected ? '#FFF' : palette.text}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: selected ? '#FFF' : palette.text },
                    ]}>
                    {meta.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={22} color="#FFF" />}
                </Pressable>
              );
            })}
          </>
        )}

        {step === 'notify' && (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications-outline" size={64} color={palette.accent} />
            </View>
            <Text style={[styles.title, { color: palette.text }]}>Включить напоминания?</Text>
            <Text style={[styles.body, { color: palette.textSecondary }]}>
              HairTrack может присылать уведомления в назначенное время процедур, чтобы вы ничего не пропустили.
              Вы всегда сможете отключить их в настройках.
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'notify' ? (
          <View style={{ gap: Spacing.md }}>
            <PrimaryButton title="Включить напоминания" onPress={() => finish(true)} />
            <Pressable onPress={() => finish(false)} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: palette.textSecondary }]}>
                Пропустить
              </Text>
            </Pressable>
          </View>
        ) : (
          <PrimaryButton
            title={step === 'welcome' ? 'Поехали' : 'Дальше'}
            onPress={next}
            disabled={!canContinue}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  optionLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  skipBtn: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  skipText: { fontSize: 16, fontWeight: '500' },
});

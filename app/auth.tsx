import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BrandMark } from '@/components/brand-mark';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/auth-context';
import { showAlert } from '@/lib/alert';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { signInWithPassword, signUpWithPassword, isConfigured } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Заполните поля', 'Введите email и пароль.');
      return;
    }
    if (password.length < 6) {
      showAlert('Слишком короткий пароль', 'Минимум 6 символов.');
      return;
    }
    setSubmitting(true);
    const result = isSignup
      ? await signUpWithPassword(email.trim(), password)
      : await signInWithPassword(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      showAlert(isSignup ? 'Не удалось создать аккаунт' : 'Не удалось войти', result.error);
      return;
    }
    if (isSignup) {
      showAlert(
        'Подтвердите почту',
        'Мы отправили письмо. Откройте его и перейдите по ссылке, чтобы завершить регистрацию.',
      );
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: isSignup ? 'Регистрация' : 'Вход',
          headerTitleStyle: { color: palette.text },
        }}
      />
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={[styles.safe, { backgroundColor: palette.background }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <BrandMark size={72} variant="mark" shape="tile" />
          </View>
          <Text style={[styles.title, { color: palette.text }]}>
            {isSignup ? 'Создать аккаунт' : 'Войти в HairTrack'}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            {isSignup
              ? 'Ваш прогресс будет сохраняться в облаке и синхронизироваться между устройствами.'
              : 'Войдите, чтобы получить доступ к своему прогрессу на других устройствах.'}
          </Text>

          {!isConfigured && (
            <View
              style={[
                styles.warning,
                { backgroundColor: palette.secondarySoft, borderLeftColor: palette.secondary },
              ]}>
              <Ionicons
                name="warning-outline"
                size={16}
                color={palette.secondary}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.warningText, { color: palette.text }]}>
                Облачная синхронизация пока не настроена. Пока продолжайте в локальном режиме — прогресс сохраняется на устройстве.
              </Text>
            </View>
          )}

          <Text style={[styles.label, { color: palette.text }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            style={[
              styles.input,
              { backgroundColor: palette.surface, color: palette.text },
            ]}
          />

          <Text style={[styles.label, { color: palette.text }]}>Пароль</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Минимум 6 символов"
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            textContentType={isSignup ? 'newPassword' : 'password'}
            style={[
              styles.input,
              { backgroundColor: palette.surface, color: palette.text },
            ]}
          />

          <View style={{ height: Spacing.xl }} />
          <PrimaryButton
            title={isSignup ? 'Создать аккаунт' : 'Войти'}
            onPress={submit}
            loading={submitting}
            disabled={!isConfigured || submitting}
          />

          <Pressable
            onPress={() => setMode(isSignup ? 'signin' : 'signup')}
            style={styles.toggleRow}>
            <Text style={[styles.toggleText, { color: palette.textSecondary }]}>
              {isSignup ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
              <Text style={{ color: palette.accent, fontWeight: '600' }}>
                {isSignup ? 'Войти' : 'Создать'}
              </Text>
            </Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable onPress={() => router.back()} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: palette.textMuted }]}>
              Продолжить без аккаунта
            </Text>
          </Pressable>
        </ScrollView>
        {submitting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={palette.accent} size="large" />
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  brandRow: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    marginBottom: Spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 17,
  },
  toggleRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  toggleText: { fontSize: 14 },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: { fontSize: 14, fontWeight: '500' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});

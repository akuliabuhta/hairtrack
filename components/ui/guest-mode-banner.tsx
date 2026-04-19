/**
 * Gentle reminder shown at the top of data screens when the user has
 * accumulated local entries without signing in. Tapping it opens the
 * auth screen. Once signed in, the banner disappears.
 *
 * Hidden in three cases:
 *   1. user is signed in,
 *   2. user has no local data yet (no procedures, photos, or journal),
 *   3. Supabase isn't configured (no cloud to sign into).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/auth-context';
import {
  useJournal,
  usePhotos,
  useProcedures,
} from '@/contexts/data-context';

export function GuestModeBanner() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { user, isConfigured } = useAuth();
  const { procedures } = useProcedures();
  const { photos } = usePhotos();
  const { journal } = useJournal();

  if (!isConfigured || user) return null;
  const hasLocalData =
    procedures.length > 0 || photos.length > 0 || journal.length > 0;
  if (!hasLocalData) return null;

  return (
    <Pressable
      onPress={() => router.push('/auth')}
      style={[
        styles.card,
        { backgroundColor: palette.accentSoft, borderColor: palette.accent },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.accent }]}>
        <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.text }]}>
          Данные только на этом устройстве
        </Text>
        <Text style={[styles.body, { color: palette.textSecondary }]}>
          Войдите, чтобы прогресс сохранялся в облаке и был доступен с других устройств.
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={palette.accent}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
  },
});

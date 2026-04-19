/**
 * Supabase client singleton.
 *
 * Reads configuration from `EXPO_PUBLIC_SUPABASE_URL` and
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` — these are safe to ship in the app
 * bundle because row-level security policies on the server gate all data
 * access per user.
 *
 * When the env vars are missing, we export a dummy client so the app
 * still runs locally (cloud sync just silently no-ops). This keeps the
 * dev flow friction-free: onboarding + local state works even before the
 * user sets up Supabase.
 */

import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  typeof SUPABASE_URL === 'string' &&
  SUPABASE_URL.length > 0 &&
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_ANON_KEY.length > 0;

/**
 * Shared client. When env vars are missing, we return a typed stub that
 * throws on any method call — the app's sync layer checks
 * `isSupabaseConfigured` before doing anything, so the stub is only a
 * safety net.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        storage: AsyncStorage as unknown as Storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(
            'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
          );
        },
      },
    ) as unknown as SupabaseClient);

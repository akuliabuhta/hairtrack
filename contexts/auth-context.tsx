/**
 * Authentication context.
 *
 * Wraps the Supabase auth lifecycle (sign in, sign up, sign out, session
 * restore) and exposes a stable hook for the rest of the app. When
 * Supabase is not configured (no env vars), every method becomes a no-op
 * so local-only mode keeps working.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthState = {
  /** True while we're still waiting for the initial session lookup. */
  hydrating: boolean;
  session: Session | null;
  user: User | null;
};

type AuthActions = {
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
};

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hydrating, setHydrating] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    if (!isSupabaseConfigured) {
      setHydrating(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
      })
      .catch((err) => {
        console.warn('[auth] getSession failed', err);
      })
      .finally(() => setHydrating(false));

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    unsub = () => data.subscription.unsubscribe();

    return () => {
      unsub?.();
    };
  }, []);

  const signInWithPassword = useCallback<AuthActions['signInWithPassword']>(
    async (email, password) => {
      if (!isSupabaseConfigured) {
        return { error: 'Облако не настроено. Зайдите позже или продолжайте без аккаунта.' };
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    },
    [],
  );

  const signUpWithPassword = useCallback<AuthActions['signUpWithPassword']>(
    async (email, password) => {
      if (!isSupabaseConfigured) {
        return { error: 'Облако не настроено. Зайдите позже или продолжайте без аккаунта.' };
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      return {};
    },
    [],
  );

  const signOut = useCallback<AuthActions['signOut']>(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState & AuthActions>(
    () => ({
      hydrating,
      session,
      user: session?.user ?? null,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      isConfigured: isSupabaseConfigured,
    }),
    [hydrating, session, signInWithPassword, signUpWithPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

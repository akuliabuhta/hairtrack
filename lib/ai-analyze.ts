/**
 * AI analysis client — wraps the Supabase Edge Function `ai-analyze`.
 *
 * The edge function does the heavy lifting: fetches photos from R2, sends
 * them to Claude Vision, parses the response, and inserts a row into the
 * `analyses` table. Here we just invoke it and massage the reply into the
 * app's Analysis shape.
 */

import { isSupabaseConfigured, supabase } from './supabase';
import type { Analysis, PhotoZone } from './types';

type EdgeRow = {
  id?: string;
  user_id?: string;
  photo_keys?: string[];
  norwood_stage?: number | null;
  ludwig_stage?: number | null;
  density_pct?: number | null;
  weak_zone?: string | null;
  asymmetry_pct?: number | null;
  overall_score?: number | null;
  summary?: string | null;
  recommendations?: string[] | null;
  model?: string;
  status?: string;
  error?: string | null;
  created_at?: string;
};

function rowToAnalysis(r: EdgeRow): Analysis {
  return {
    id: r.id ?? crypto.randomUUID?.() ?? '',
    photoKeys: r.photo_keys ?? [],
    norwoodStage: r.norwood_stage ?? null,
    ludwigStage: r.ludwig_stage ?? null,
    densityPct: r.density_pct ?? null,
    weakZone: (r.weak_zone as PhotoZone | null) ?? null,
    asymmetryPct: r.asymmetry_pct ?? null,
    overallScore: r.overall_score ?? null,
    summary: r.summary ?? undefined,
    recommendations: r.recommendations ?? [],
    model: r.model ?? 'claude-sonnet-4-5',
    status: (r.status as Analysis['status']) ?? 'completed',
    error: r.error ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

export type AnalyzeResult =
  | { ok: true; analysis: Analysis; persisted: boolean }
  | { ok: false; reason: string };

export async function runAiAnalysis(storageKeys: string[]): Promise<AnalyzeResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, reason: 'Supabase не настроен' };
  }
  if (storageKeys.length === 0) {
    return { ok: false, reason: 'Нужно хотя бы одно фото' };
  }
  try {
    const { data, error } = await supabase.functions.invoke<{
      analysis: EdgeRow;
      persisted?: boolean;
      warning?: string;
      error?: string;
    }>('ai-analyze', { body: { storageKeys } });

    if (error) {
      return { ok: false, reason: error.message ?? 'Edge function error' };
    }
    if (!data || data.error) {
      return { ok: false, reason: data?.error ?? 'Пустой ответ от сервера' };
    }
    if (!data.analysis) {
      return { ok: false, reason: 'Ответ не содержит анализа' };
    }
    return {
      ok: true,
      analysis: rowToAnalysis(data.analysis),
      persisted: data.persisted !== false,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Pull the history of analyses for the current user (newest first).
 * Used on the AI Analysis screen to show past runs.
 */
export async function fetchAnalyses(userId: string): Promise<Analysis[]> {
  if (!isSupabaseConfigured || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.warn('[ai-analyze] fetch history failed', error.message);
      return [];
    }
    return (data ?? []).map((r) => rowToAnalysis(r as EdgeRow));
  } catch (err) {
    console.warn('[ai-analyze] fetch history threw', err);
    return [];
  }
}

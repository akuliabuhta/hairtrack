/**
 * ai-analyze — run a single hair/scalp analysis pass on up to 3 photos.
 *
 * Flow:
 *   1. verify the caller's Supabase session
 *   2. for each storage_key, fetch the bytes from R2 (via a presigned GET)
 *   3. send them as base64 image blocks to Anthropic Claude Vision
 *   4. request a strict JSON structure describing Norwood stage, density,
 *      weak zone, asymmetry, overall score, and actionable recommendations
 *   5. insert a row into the `analyses` table tied to the user
 *   6. return the parsed structure to the app
 *
 * The Anthropic key never leaves this function — the app just asks for
 * an analysis by photo id, and receives the structured result.
 *
 * Required secrets (same secrets as R2 functions + one new):
 *   - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   - ANTHROPIC_API_KEY
 *   - SUPABASE_URL, SUPABASE_ANON_KEY (auto-provided)
 *   - SUPABASE_SERVICE_ROLE_KEY (auto-provided) — used to insert analysis
 *     rows server-side after the request auth check
 */

// @ts-nocheck Deno runtime.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = 'claude-sonnet-4-5';
const MAX_PHOTOS = 3;
const MAX_TOKENS = 1500;

const SYSTEM_PROMPT = `Ты — ассистент-трихолог. Пользователь загружает от 1 до 3 фотографий состояния волос (обычно: макушка, линия роста, боковой профиль; либо борода / брови). Твоя задача — дать структурированный анализ в JSON.

Обязательно возвращай ТОЛЬКО валидный JSON без пояснений, markdown, кода или чего-либо ещё. Формат ровно такой (если какая-то метрика не применима — ставь null, например ludwig_stage для мужских фото):

{
  "norwood_stage": 1-7 | null,   // стадия мужского облысения (Norwood-Hamilton)
  "ludwig_stage": 1-3 | null,    // стадия женского облысения (Ludwig), или null
  "density_pct": 0-100,          // оценка плотности волос, где 100 — максимум для возраста
  "weak_zone": "crown" | "hairline" | "temples" | "side" | "beard" | "brows" | "other",
  "asymmetry_pct": 0-100,        // насколько заметна асимметрия между половинами
  "overall_score": 0-100,        // общий health score
  "summary": "1-2 предложения краткого резюме на русском",
  "recommendations": [
    "конкретный совет 1",
    "конкретный совет 2",
    "конкретный совет 3"
  ]
}

Будь осторожен: это справочный самоконтроль, не медицинский диагноз. В summary мягко напомни про это.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Auth ---------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing authorization' }, 401);

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: 'invalid session' }, 401);
    }
    const userId = userData.user.id;

    // --- Input --------------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const storageKeys: unknown = body.storageKeys;
    if (!Array.isArray(storageKeys) || storageKeys.length === 0 || storageKeys.length > MAX_PHOTOS) {
      return json({ error: `storageKeys must be 1..${MAX_PHOTOS} strings` }, 400);
    }
    const userPrefix = `users/${userId}/`;
    for (const k of storageKeys) {
      if (typeof k !== 'string' || !k.startsWith(userPrefix)) {
        return json({ error: 'one or more storageKeys do not belong to the caller' }, 403);
      }
    }

    // --- Secrets ------------------------------------------------------
    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const bucket = Deno.env.get('R2_BUCKET_NAME');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      return json({ error: 'R2 credentials missing' }, 500);
    }
    if (!anthropicKey) {
      return json({ error: 'ANTHROPIC_API_KEY missing' }, 500);
    }

    // --- Fetch bytes from R2 via presigned GET ------------------------
    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      service: 's3',
    });

    const images: { mediaType: string; base64: string }[] = [];
    for (const key of storageKeys as string[]) {
      const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
      url.searchParams.set('X-Amz-Expires', '120');
      const signed = await aws.sign(url, { method: 'GET', aws: { signQuery: true } });
      const res = await fetch(signed.url.toString());
      if (!res.ok) {
        return json({ error: `failed to fetch ${key} from R2 (${res.status})` }, 500);
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      // Base64 encode — Deno has a btoa equivalent.
      let binary = '';
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      const base64 = btoa(binary);
      const mediaType = res.headers.get('content-type') ?? guessMediaType(key);
      images.push({ mediaType, base64 });
    }

    // --- Call Claude Vision -------------------------------------------
    const claudeReq = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...images.map((img) => ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mediaType,
                data: img.base64,
              },
            })),
            {
              type: 'text',
              text: 'Проанализируй эти фото волос и верни JSON по схеме, описанной в инструкции.',
            },
          ],
        },
      ],
    };

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(claudeReq),
    });
    if (!claudeRes.ok) {
      const errText = await claudeRes.text().catch(() => '');
      console.error('[ai-analyze] Claude error', claudeRes.status, errText.slice(0, 500));
      return json(
        { error: `Claude API returned ${claudeRes.status}`, detail: errText.slice(0, 500) },
        502,
      );
    }
    const claudeJson = await claudeRes.json();
    const textBlock = claudeJson.content?.find?.((b: any) => b.type === 'text');
    const text: string = textBlock?.text ?? '';
    const parsed = safeParseJson(text);
    if (!parsed) {
      return json({ error: 'Claude returned non-JSON', raw: text.slice(0, 500) }, 502);
    }

    // --- Persist the analysis row (service role bypasses RLS, but we
    //     still scope by user_id ourselves).
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey || Deno.env.get('SUPABASE_ANON_KEY') || '',
    );

    const insertRow = {
      user_id: userId,
      photo_keys: storageKeys,
      norwood_stage: clampInt(parsed.norwood_stage, 1, 7),
      ludwig_stage: clampInt(parsed.ludwig_stage, 1, 3),
      density_pct: clampInt(parsed.density_pct, 0, 100),
      weak_zone: normalizeZone(parsed.weak_zone),
      asymmetry_pct: clampInt(parsed.asymmetry_pct, 0, 100),
      overall_score: clampInt(parsed.overall_score, 0, 100),
      summary: typeof parsed.summary === 'string' ? parsed.summary : null,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((s) => typeof s === 'string').slice(0, 10)
        : [],
      raw_response: claudeJson,
      model: MODEL,
      status: 'completed',
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('analyses')
      .insert(insertRow)
      .select('*')
      .single();
    if (insErr) {
      console.warn('[ai-analyze] insert failed', insErr.message);
      // Still return the analysis — the user shouldn't lose it just
      // because we couldn't persist.
      return json({ analysis: insertRow, persisted: false, warning: insErr.message });
    }

    return json({ analysis: inserted, persisted: true });
  } catch (err) {
    console.error('[ai-analyze] unhandled', err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function guessMediaType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function clampInt(value: unknown, min: number, max: number): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  const clamped = Math.round(Math.min(max, Math.max(min, n)));
  return clamped;
}

const ZONES = ['crown', 'hairline', 'temples', 'side', 'beard', 'brows', 'other'] as const;
function normalizeZone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase().trim();
  if ((ZONES as readonly string[]).includes(lower)) return lower;
  return 'other';
}

function safeParseJson(text: string): any {
  // Strip common wrappers — sometimes the model adds ```json fences
  // despite the instructions.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first balanced { ... } block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

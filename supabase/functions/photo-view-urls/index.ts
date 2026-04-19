/**
 * photo-view-urls — issues short-lived presigned GET URLs for R2 objects.
 *
 * Input: { storageKeys: string[] }  (up to 100 keys per call)
 * Output: { urls: Record<storageKey, viewUrl> }
 *
 * Every returned URL is valid for ~1 hour. The function enforces that
 * each requested key starts with `users/<current-user>/` so a user
 * can't ask for another user's photo URLs.
 *
 * Same secrets as photo-upload-url.
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

const MAX_KEYS = 100;
const URL_TTL_SECONDS = 60 * 60; // 1 hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'missing authorization header' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: 'invalid session' }, 401);
    }
    const userId = userData.user.id;
    const userPrefix = `users/${userId}/`;

    const body = await req.json().catch(() => ({}));
    const keys: unknown = body.storageKeys;
    if (!Array.isArray(keys)) {
      return json({ error: 'storageKeys must be an array' }, 400);
    }
    if (keys.length > MAX_KEYS) {
      return json({ error: `at most ${MAX_KEYS} keys per call` }, 400);
    }

    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const bucket = Deno.env.get('R2_BUCKET_NAME');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      return json({ error: 'R2 credentials not configured' }, 500);
    }

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      service: 's3',
    });

    const urls: Record<string, string> = {};
    for (const rawKey of keys) {
      if (typeof rawKey !== 'string' || !rawKey.startsWith(userPrefix)) {
        // Silently skip — never 404 a caller, just don't issue URLs for
        // keys outside their namespace.
        continue;
      }
      const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${rawKey}`);
      url.searchParams.set('X-Amz-Expires', String(URL_TTL_SECONDS));
      const signed = await aws.sign(url, {
        method: 'GET',
        aws: { signQuery: true },
      });
      urls[rawKey] = signed.url.toString();
    }

    return json({ urls, expiresIn: URL_TTL_SECONDS });
  } catch (err) {
    console.error('[photo-view-urls] unhandled', err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

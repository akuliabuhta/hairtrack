/**
 * photo-upload-url — issues a short-lived presigned PUT URL for Cloudflare R2.
 *
 * The app calls this function when it needs to upload a new photo. The
 * function:
 *  1. verifies the caller's Supabase session (so only logged-in users can
 *     request uploads),
 *  2. composes a user-scoped storage key so users can't overwrite each
 *     other's files,
 *  3. signs a short-lived (5 min) PUT URL with the R2 credentials stored
 *     in Supabase secrets.
 *
 * The R2 access key / secret NEVER leave this function — the app only
 * receives the signed URL and the storage key.
 *
 * Required secrets:
 *   - R2_ACCOUNT_ID
 *   - R2_ACCESS_KEY_ID
 *   - R2_SECRET_ACCESS_KEY
 *   - R2_BUCKET_NAME
 *
 * Required env (auto-provided by Supabase):
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 */

// @ts-nocheck Deno runtime; types come from esm.sh at deploy time.

import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Auth ---------------------------------------------------------
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

    // --- Input --------------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const photoId: string | undefined = body.photoId;
    const contentType: string = body.contentType || 'image/jpeg';

    if (!photoId || !UUID_RE.test(photoId)) {
      return json({ error: 'photoId must be a UUID' }, 400);
    }
    if (!contentType.startsWith('image/')) {
      return json({ error: 'contentType must be an image/*' }, 400);
    }

    // --- Signing ------------------------------------------------------
    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const bucket = Deno.env.get('R2_BUCKET_NAME');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      return json({ error: 'R2 credentials not configured' }, 500);
    }

    // Example extension resolution (jpeg by default).
    const ext = contentType.split('/')[1]?.split('+')[0] || 'jpg';
    const storageKey = `users/${userId}/${photoId}.${ext}`;

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      service: 's3',
    });

    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${storageKey}`);
    url.searchParams.set('X-Amz-Expires', '300'); // 5 minutes

    const signed = await aws.sign(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      aws: { signQuery: true },
    });

    return json({
      uploadUrl: signed.url.toString(),
      storageKey,
      contentType,
      expiresIn: 300,
    });
  } catch (err) {
    console.error('[photo-upload-url] unhandled', err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Photo upload client — moves local photos up to Cloudflare R2 via our
 * Supabase Edge Function `photo-upload-url`.
 *
 * Flow:
 *   1. The app calls `uploadPhotoToCloud(photoId, localUri)`.
 *   2. We invoke the edge function to get a short-lived presigned PUT URL
 *      and the final storage key (`users/<uid>/<photoId>.jpg`).
 *   3. We PUT the bytes directly to R2. The R2 access key / secret never
 *      leave the edge function.
 *
 * Works on web (fetch → blob → PUT) and native (expo-file-system reads
 * the file and we PUT its contents).
 *
 * Best-effort: every mutation of the local Photos table fires an upload
 * attempt in the background. A failed upload just means the photo stays
 * local until the next attempt (we'll add a retry queue when needed).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';

export type UploadOk = {
  ok: true;
  storageKey: string;
};
export type UploadErr = {
  ok: false;
  reason: string;
};
export type UploadResult = UploadOk | UploadErr;

/**
 * Read a local file at `uri` and return a Blob that can be PUT to a
 * presigned URL. Handles the three cases we see on web vs native:
 *
 *  - `file://…` on native → read via expo-file-system as base64, convert.
 *  - `blob:` / `http://…` (web-picker URLs) → fetch().blob().
 *  - data URL → fetch().blob() handles this too.
 */
async function readAsBlob(uri: string, contentType: string): Promise<Blob> {
  if (Platform.OS === 'web' || !uri.startsWith('file://')) {
    const res = await fetch(uri);
    return await res.blob();
  }
  // Native path: read the file as base64 and inflate into an ArrayBuffer.
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const byteString = atob(b64);
  const buffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) buffer[i] = byteString.charCodeAt(i);
  return new Blob([buffer], { type: contentType });
}

function inferContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

/**
 * Upload a single photo to R2. Returns the storage key to save in the
 * Photos table on success; returns an error envelope on failure so the
 * caller can decide whether to retry.
 */
export async function uploadPhotoToCloud(
  photoId: string,
  localUri: string,
): Promise<UploadResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, reason: 'supabase-not-configured' };
  }
  try {
    const contentType = inferContentType(localUri);

    // 1. Ask our edge function for a presigned URL.
    const { data, error } = await supabase.functions.invoke<{
      uploadUrl: string;
      storageKey: string;
    }>('photo-upload-url', { body: { photoId, contentType } });

    if (error || !data?.uploadUrl) {
      const reason = error?.message ?? 'no upload url returned';
      console.warn('[photo-upload] edge function failed', reason);
      return { ok: false, reason };
    }

    // 2. Read the local bytes and PUT them.
    const blob = await readAsBlob(localUri, contentType);
    const res = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[photo-upload] R2 PUT failed', res.status, body.slice(0, 200));
      return { ok: false, reason: `R2 ${res.status}` };
    }
    return { ok: true, storageKey: data.storageKey };
  } catch (err) {
    console.warn('[photo-upload] threw', err);
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Batch-fetch short-lived viewer URLs for a set of storage keys.
 * The edge function enforces that each key belongs to the calling user,
 * so we don't need to guard here — but we also skip empty input to avoid
 * round-trips.
 */
export async function getPhotoViewUrls(
  storageKeys: string[],
): Promise<Record<string, string>> {
  if (!isSupabaseConfigured || storageKeys.length === 0) return {};
  try {
    const { data, error } = await supabase.functions.invoke<{
      urls: Record<string, string>;
    }>('photo-view-urls', { body: { storageKeys } });
    if (error) {
      console.warn('[photo-upload] view-urls failed', error.message);
      return {};
    }
    return data?.urls ?? {};
  } catch (err) {
    console.warn('[photo-upload] view-urls threw', err);
    return {};
  }
}

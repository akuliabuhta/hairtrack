/**
 * Photo storage helpers.
 *
 * Original picker/camera URIs live in volatile cache directories. We copy
 * each photo into the app's persistent document directory under
 * `photos/<id>.jpg` so it survives across launches and can be referenced by
 * the Photos collection in storage.ts.
 *
 * On the web build, expo-file-system is a no-op shim — we just return the
 * incoming URI as-is (it's a blob:/data: URL the browser keeps alive for
 * the session).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { Photo } from './types';
import { uid } from './uuid';

/**
 * Static check for a photo we can't display and can't recover:
 *  - no R2 storageKey (upload never completed), AND
 *  - no usable local uri (missing, or a web `blob:` from a past session
 *    that 404s after reload).
 *
 * Doesn't cover the runtime case where storageKey is set but the R2
 * object is actually missing — callers detect that through <Image
 * onError> and track it locally.
 */
export function isStaticallyBrokenPhoto(p: Photo): boolean {
  if (p.storageKey) return false;
  if (!p.uri) return true;
  if (Platform.OS === 'web' && p.uri.startsWith('blob:')) return true;
  return false;
}

const PHOTO_DIR =
  Platform.OS === 'web' ? '' : `${FileSystem.documentDirectory ?? ''}photos/`;

async function ensureDir() {
  if (Platform.OS === 'web' || !PHOTO_DIR) return;
  try {
    const info = await FileSystem.getInfoAsync(PHOTO_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
    }
  } catch (err) {
    console.warn('[photos] ensureDir failed', err);
  }
}

/**
 * Copy a picker/camera URI into the persistent photo dir and return the new
 * stable URI plus a generated id (the file name without extension).
 */
export async function persistPhoto(sourceUri: string): Promise<{ id: string; uri: string }> {
  const id = uid();
  if (Platform.OS === 'web') {
    // Browser keeps blob/data URLs alive — nothing to copy.
    return { id, uri: sourceUri };
  }
  await ensureDir();
  const ext = sourceUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const dest = `${PHOTO_DIR}${id}.${ext}`;
  try {
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return { id, uri: dest };
  } catch (err) {
    console.warn('[photos] copy failed, falling back to source uri', err);
    return { id, uri: sourceUri };
  }
}

export async function deletePhotoFile(uri: string): Promise<void> {
  if (Platform.OS === 'web' || !uri.startsWith('file://')) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (err) {
    console.warn('[photos] delete failed', err);
  }
}

/**
 * AsyncStorage-backed persistence layer.
 *
 * Why not SQLite for v1?
 *  - Hairtrack records are tiny (procedures, logs, journal entries) — even at
 *    a year of daily use we're talking <1 MB. AsyncStorage handles that
 *    instantly and works on web (SQLite Web requires a different module).
 *  - Photos themselves live as files in the document directory and we only
 *    persist their URIs here.
 *  - Migration path to SQLite later is clean: same shape collections, just
 *    swap the read/write functions.
 *
 * All collections are stored as JSON arrays under namespaced keys.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  JournalEntry,
  Photo,
  Procedure,
  ProcedureLog,
  UserProfile,
} from './types';
import { DEFAULT_PROFILE } from './types';

const KEYS = {
  procedures: '@hairtrack/procedures/v1',
  procedureLogs: '@hairtrack/procedure-logs/v1',
  photos: '@hairtrack/photos/v1',
  journal: '@hairtrack/journal/v1',
  profile: '@hairtrack/profile/v1',
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[storage] read failed for ${key}`, err);
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] write failed for ${key}`, err);
  }
}

// ---- Procedures -----------------------------------------------------------
export const Procedures = {
  list: () => readJson<Procedure[]>(KEYS.procedures, []),
  save: (items: Procedure[]) => writeJson(KEYS.procedures, items),
};

// ---- Procedure logs (per day, per procedure) ------------------------------
export const ProcedureLogs = {
  list: () => readJson<ProcedureLog[]>(KEYS.procedureLogs, []),
  save: (items: ProcedureLog[]) => writeJson(KEYS.procedureLogs, items),
};

// ---- Photos ---------------------------------------------------------------
export const Photos = {
  list: () => readJson<Photo[]>(KEYS.photos, []),
  save: (items: Photo[]) => writeJson(KEYS.photos, items),
};

// ---- Journal --------------------------------------------------------------
export const Journal = {
  list: () => readJson<JournalEntry[]>(KEYS.journal, []),
  save: (items: JournalEntry[]) => writeJson(KEYS.journal, items),
};

// ---- Profile --------------------------------------------------------------
export const Profile = {
  get: () => readJson<UserProfile>(KEYS.profile, DEFAULT_PROFILE),
  set: (profile: UserProfile) => writeJson(KEYS.profile, profile),
};

// ---- Whole-store dump for export/backup ----------------------------------
export async function exportAll() {
  const [procedures, procedureLogs, photos, journal, profile] = await Promise.all([
    Procedures.list(),
    ProcedureLogs.list(),
    Photos.list(),
    Journal.list(),
    Profile.get(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    procedures,
    procedureLogs,
    photos,
    journal,
    profile,
  };
}

export async function clearAll(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((k) => AsyncStorage.removeItem(k)));
}

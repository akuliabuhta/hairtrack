/**
 * Cloud sync layer.
 *
 * Wraps Supabase `from('…').upsert/delete/select` calls and the
 * camelCase ↔ snake_case mapping between our local domain types and the
 * database row shapes.
 *
 * Policy for v1:
 *  - All writes are fire-and-forget with best-effort error logging.
 *    We don't block the UI on network round-trips; local state is the
 *    source of truth, and the cloud is a durable copy.
 *  - On sign-in we pull every collection in parallel and merge into the
 *    local state (server rows win on id conflict).
 *  - No background retry queue yet — if a push fails (offline, 5xx),
 *    the next mutation of the same row will retry via upsert. Photos
 *    aren't uploaded yet; we push their metadata with a null storage_key
 *    until the R2 layer lands.
 */

import { supabase } from './supabase';
import type {
  Goal,
  JournalEntry,
  Mood,
  Photo,
  PhotoZone,
  Procedure,
  ProcedureKind,
  ProcedureLog,
  UserProfile,
} from './types';

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function procedureToRow(p: Procedure, userId: string): Row {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    kinds: p.kinds,
    target_zones: p.targetZones,
    amount: p.amount,
    unit: p.unit,
    frequency_per_day: p.frequencyPerDay,
    reminder_times: p.reminderTimes,
    notes: p.notes ?? null,
    archived_at: p.archivedAt ?? null,
    created_at: p.createdAt,
  };
}

function rowToProcedure(r: Row): Procedure {
  // Back-compat: accept either a `kinds` array or a legacy single `kind`.
  const kinds =
    (r.kinds as ProcedureKind[] | null | undefined) ??
    (r.kind ? [r.kind as ProcedureKind] : ['other']);
  return {
    id: String(r.id),
    name: String(r.name),
    kinds: kinds.length > 0 ? kinds : ['other'],
    targetZones: (r.target_zones as Goal[] | null) ?? [],
    amount: Number(r.amount),
    unit: String(r.unit),
    frequencyPerDay: Number(r.frequency_per_day),
    reminderTimes: (r.reminder_times as string[] | null) ?? [],
    notes: (r.notes as string | null) ?? undefined,
    archivedAt: (r.archived_at as string | null) ?? undefined,
    createdAt: String(r.created_at),
  };
}

function logToRow(l: ProcedureLog, userId: string): Row {
  return {
    id: l.id,
    user_id: userId,
    procedure_id: l.procedureId,
    log_date: l.date,
    count: l.count,
    updated_at: l.updatedAt,
  };
}

function rowToLog(r: Row): ProcedureLog {
  return {
    id: String(r.id),
    procedureId: String(r.procedure_id),
    date: String(r.log_date),
    count: Number(r.count),
    updatedAt: String(r.updated_at),
  };
}

function journalToRow(j: JournalEntry, userId: string): Row {
  return {
    id: j.id,
    user_id: userId,
    log_date: j.date,
    text: j.text,
    mood: j.mood ?? null,
    symptoms: j.symptoms ?? [],
    created_at: j.createdAt,
    updated_at: j.updatedAt,
  };
}

function rowToJournal(r: Row): JournalEntry {
  return {
    id: String(r.id),
    date: String(r.log_date),
    text: String(r.text ?? ''),
    mood: (r.mood as Mood | null) ?? undefined,
    symptoms: (r.symptoms as string[] | null) ?? undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function photoToRow(p: Photo, userId: string): Row {
  return {
    id: p.id,
    user_id: userId,
    // Once the R2 upload succeeds we fill this in; until then the row
    // has a null storage_key and a non-null local_uri — other devices
    // can still see metadata but won't be able to render the image
    // until the original device uploads it.
    storage_key: p.storageKey ?? null,
    local_uri: p.uri,
    log_date: p.date,
    zone: p.zone,
    note: p.note ?? null,
    width: p.width ?? null,
    height: p.height ?? null,
    created_at: p.createdAt,
  };
}

function rowToPhoto(r: Row): Photo {
  const storageKey = (r.storage_key as string | null) ?? undefined;
  return {
    id: String(r.id),
    // Prefer a usable local URI if the cloud row carries one (same device),
    // otherwise fall back to an empty string — the view layer resolves the
    // real viewable URL from `storageKey` via photo-view-urls when needed.
    uri: String(r.local_uri ?? ''),
    storageKey,
    date: String(r.log_date),
    zone: r.zone as PhotoZone,
    note: (r.note as string | null) ?? undefined,
    width: (r.width as number | null) ?? undefined,
    height: (r.height as number | null) ?? undefined,
    createdAt: String(r.created_at),
  };
}

function profileToRow(p: UserProfile, userId: string): Row {
  return {
    id: userId,
    gender: p.gender ?? null,
    goals: p.goals ?? [],
    start_date: p.startDate ?? null,
    onboarding_completed: p.onboardingCompleted,
    notifications_enabled: p.notificationsEnabled,
    daily_summary: p.dailySummary,
  };
}

function rowToProfile(r: Row): Partial<UserProfile> {
  return {
    gender: (r.gender as UserProfile['gender']) ?? undefined,
    goals: (r.goals as UserProfile['goals']) ?? [],
    startDate: (r.start_date as string | null) ?? undefined,
    onboardingCompleted: Boolean(r.onboarding_completed),
    notificationsEnabled: Boolean(r.notifications_enabled),
    dailySummary: Boolean(r.daily_summary),
  };
}

// ---------------------------------------------------------------------------
// Push helpers (fire-and-forget)
// ---------------------------------------------------------------------------

async function safeUpsert(table: string, payload: Row | Row[]) {
  try {
    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
      console.error(
        `[sync] upsert ${table} failed:`,
        error.message,
        'code=' + (error as { code?: string }).code,
        'details=' + (error as { details?: string }).details,
        'payload=' + JSON.stringify(payload),
      );
    }
  } catch (err) {
    console.error(`[sync] upsert ${table} threw`, err);
  }
}

async function safeDelete(table: string, id: string, userId: string) {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
    if (error) {
      console.error(
        `[sync] delete ${table} failed:`,
        error.message,
        'code=' + (error as { code?: string }).code,
      );
    }
  } catch (err) {
    console.error(`[sync] delete ${table} threw`, err);
  }
}

export async function pushProcedure(p: Procedure, userId: string) {
  return safeUpsert('procedures', procedureToRow(p, userId));
}

export async function deleteProcedure(id: string, userId: string) {
  return safeDelete('procedures', id, userId);
}

export async function pushProcedureLog(log: ProcedureLog, userId: string) {
  return safeUpsert('procedure_logs', logToRow(log, userId));
}

export async function pushJournal(j: JournalEntry, userId: string) {
  return safeUpsert('journal_entries', journalToRow(j, userId));
}

export async function deleteJournal(id: string, userId: string) {
  return safeDelete('journal_entries', id, userId);
}

export async function pushPhoto(p: Photo, userId: string) {
  return safeUpsert('photos', photoToRow(p, userId));
}

export async function deletePhoto(id: string, userId: string) {
  return safeDelete('photos', id, userId);
}

export async function pushProfile(p: UserProfile, userId: string) {
  // Profile rows are created by the handle_new_user trigger on sign-up; upsert
  // keeps subsequent edits flowing.
  return safeUpsert('profiles', profileToRow(p, userId));
}

// ---------------------------------------------------------------------------
// Pull: snapshot of every user collection, used on sign-in.
// ---------------------------------------------------------------------------

export type CloudSnapshot = {
  profile: Partial<UserProfile>;
  procedures: Procedure[];
  procedureLogs: ProcedureLog[];
  journal: JournalEntry[];
  photos: Photo[];
};

export async function pullAll(userId: string): Promise<CloudSnapshot | null> {
  try {
    const [profileRes, proceduresRes, logsRes, journalRes, photosRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('procedures').select('*').eq('user_id', userId),
      supabase.from('procedure_logs').select('*').eq('user_id', userId),
      supabase.from('journal_entries').select('*').eq('user_id', userId),
      supabase.from('photos').select('*').eq('user_id', userId),
    ]);

    return {
      profile: profileRes.data ? rowToProfile(profileRes.data as Row) : {},
      procedures: ((proceduresRes.data as Row[]) ?? []).map(rowToProcedure),
      procedureLogs: ((logsRes.data as Row[]) ?? []).map(rowToLog),
      journal: ((journalRes.data as Row[]) ?? []).map(rowToJournal),
      photos: ((photosRes.data as Row[]) ?? []).map(rowToPhoto),
    };
  } catch (err) {
    console.warn('[sync] pullAll failed', err);
    return null;
  }
}

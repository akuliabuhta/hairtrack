/**
 * Single source of truth for all app state.
 *
 * The provider boots from AsyncStorage on first mount, keeps an in-memory
 * copy for fast renders, and persists every mutation back to storage. All
 * screens consume data via the typed hooks at the bottom of the file.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Journal as JournalStore,
  Photos as PhotosStore,
  Procedures as ProceduresStore,
  ProcedureLogs as LogsStore,
  Profile as ProfileStore,
} from '@/lib/storage';
import {
  cancelAll as cancelAllNotifications,
  rescheduleProcedure,
  requestNotificationPermissions,
} from '@/lib/notifications';
import { deletePhotoFile } from '@/lib/photos';
import { getPhotoViewUrls, uploadPhotoToCloud } from '@/lib/photo-upload';
import * as Cloud from '@/lib/sync';
import type {
  DayKey,
  JournalEntry,
  Photo,
  Procedure,
  ProcedureLog,
  UserProfile,
} from '@/lib/types';
import { DEFAULT_PROFILE } from '@/lib/types';
import { dayKey, isUuid, uid } from '@/lib/uuid';
import { useAuth } from '@/contexts/auth-context';

type State = {
  ready: boolean;
  procedures: Procedure[];
  procedureLogs: ProcedureLog[];
  photos: Photo[];
  journal: JournalEntry[];
  profile: UserProfile;
  /**
   * Signed R2 view URLs keyed by storageKey. Refreshed periodically so
   * components can render cloud-only photos (e.g. on a new device after
   * sign-in) without each one fetching its own URL.
   */
  photoUrls: Record<string, string>;
};

type Actions = {
  // Procedures
  addProcedure: (input: Omit<Procedure, 'id' | 'createdAt'>) => Promise<Procedure>;
  updateProcedure: (id: string, patch: Partial<Procedure>) => Promise<void>;
  deleteProcedure: (id: string) => Promise<void>;

  // Procedure logs
  setProcedureCount: (procedureId: string, day: DayKey, count: number) => Promise<void>;
  tickProcedure: (procedureId: string, day: DayKey) => Promise<void>;

  // Photos
  addPhoto: (input: Omit<Photo, 'id' | 'createdAt'>) => Promise<Photo>;
  deletePhoto: (id: string) => Promise<void>;

  // Journal
  upsertJournal: (input: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<JournalEntry>;
  deleteJournal: (id: string) => Promise<void>;

  // Profile
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;

  // Maintenance
  resetAll: () => Promise<void>;
};

const DataContext = createContext<(State & Actions) | null>(null);

const initialState: State = {
  ready: false,
  procedures: [],
  procedureLogs: [],
  photos: [],
  journal: [],
  profile: DEFAULT_PROFILE,
  photoUrls: {},
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // ---- Hydration --------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rawProcedures, rawLogs, rawPhotos, rawJournal, profile] = await Promise.all([
        ProceduresStore.list(),
        LogsStore.list(),
        PhotosStore.list(),
        JournalStore.list(),
        ProfileStore.get(),
      ]);

      // ---- Migrations for older local records -------------------------
      // (1) Regenerate non-UUID IDs. Early builds used short base36 IDs
      //     which PostgreSQL refuses as `uuid`, so cloud sync silently
      //     failed. Remap the ids here and fix FK references in logs.
      const idRemap: Record<string, string> = {};
      const ensureUuid = (oldId: string): string => {
        if (isUuid(oldId)) return oldId;
        if (!(oldId in idRemap)) idRemap[oldId] = uid();
        return idRemap[oldId];
      };

      // (2) Shape migration:
      //     - `kind: ProcedureKind` → `kinds: [kind]`
      //     - missing `targetZones` → []
      const procedures: Procedure[] = rawProcedures.map((p) => {
        const anyP = p as Procedure & { kind?: string };
        return {
          ...p,
          id: ensureUuid(p.id),
          kinds:
            anyP.kinds && anyP.kinds.length > 0
              ? anyP.kinds
              : anyP.kind
                ? [anyP.kind as Procedure['kinds'][number]]
                : ['other'],
          targetZones: p.targetZones ?? [],
        };
      });

      const procedureLogs: ProcedureLog[] = rawLogs.map((l) => ({
        ...l,
        id: ensureUuid(l.id),
        procedureId: ensureUuid(l.procedureId),
      }));

      const photos: Photo[] = rawPhotos.map((p) => ({ ...p, id: ensureUuid(p.id) }));
      const journal: JournalEntry[] = rawJournal.map((j) => ({
        ...j,
        id: ensureUuid(j.id),
      }));

      // Persist migrated arrays so the next boot sees clean data.
      if (Object.keys(idRemap).length > 0) {
        await Promise.all([
          ProceduresStore.save(procedures),
          LogsStore.save(procedureLogs),
          PhotosStore.save(photos),
          JournalStore.save(journal),
        ]);
      }

      if (cancelled) return;
      setState({
        ready: true,
        procedures,
        procedureLogs,
        photos,
        journal,
        profile,
        photoUrls: {},
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Cloud sync on sign-in -------------------------------------------
  // When the user signs in (or a session is restored), pull their cloud
  // snapshot and merge with local state. Cloud wins on id conflict; local
  // rows not present in the cloud are pushed up so the user never loses
  // data they entered while anonymous.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const snapshot = await Cloud.pullAll(userId);
      if (cancelled || !snapshot) return;

      // Merge local + remote by id (cloud wins on conflict, local-only
      // rows survive). Do the merge OUTSIDE setState so we can both set
      // React state and persist the *merged* arrays to disk — persisting
      // only the snapshot would wipe any local-only rows when the cloud
      // is empty (which is exactly the first-sign-in case).
      const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
        const byId = new Map<string, T>();
        for (const row of local) byId.set(row.id, row);
        for (const row of remote) byId.set(row.id, row);
        return Array.from(byId.values());
      };
      const mergedProcedures = mergeById(state.procedures, snapshot.procedures);
      const mergedLogs = mergeById(state.procedureLogs, snapshot.procedureLogs);
      const mergedJournal = mergeById(state.journal, snapshot.journal);
      const mergedPhotos = mergeById(state.photos, snapshot.photos);
      const mergedProfile: UserProfile = {
        ...state.profile,
        ...snapshot.profile,
        // Local onboarding state wins — it's a UX flag, not data.
        onboardingCompleted:
          snapshot.profile.onboardingCompleted || state.profile.onboardingCompleted,
      };

      setState((prev) => ({
        ready: true,
        procedures: mergedProcedures,
        procedureLogs: mergedLogs,
        journal: mergedJournal,
        photos: mergedPhotos,
        profile: mergedProfile,
        photoUrls: prev.photoUrls, // keep any URLs we've already resolved
      }));

      // Push local rows that the cloud doesn't yet know about.
      const remoteProcIds = new Set(snapshot.procedures.map((p) => p.id));
      for (const p of state.procedures) {
        if (!remoteProcIds.has(p.id)) Cloud.pushProcedure(p, userId);
      }
      const remoteLogIds = new Set(snapshot.procedureLogs.map((l) => l.id));
      for (const l of state.procedureLogs) {
        if (!remoteLogIds.has(l.id)) Cloud.pushProcedureLog(l, userId);
      }
      const remoteJournalIds = new Set(snapshot.journal.map((j) => j.id));
      for (const j of state.journal) {
        if (!remoteJournalIds.has(j.id)) Cloud.pushJournal(j, userId);
      }
      const remotePhotoIds = new Set(snapshot.photos.map((p) => p.id));
      for (const p of state.photos) {
        if (!remotePhotoIds.has(p.id)) Cloud.pushPhoto(p, userId);
      }
      // Push local profile if the row was just created by the trigger.
      Cloud.pushProfile(mergedProfile, userId);

      // Persist the MERGED arrays (not the snapshot!) so the next boot
      // sees both cloud rows and any local-only ones that are still in
      // flight to the cloud.
      await Promise.all([
        ProceduresStore.save(mergedProcedures),
        LogsStore.save(mergedLogs),
        PhotosStore.save(mergedPhotos),
        JournalStore.save(mergedJournal),
      ]);
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally only depend on userId — we don't want to refetch on
    // every local mutation. state.* in the push-loop is read on latest via
    // closure capture, which is fine as a best-effort bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---- Resolve R2 view URLs ---------------------------------------------
  // Photos that have a storage_key but no usable local URI need a signed
  // GET URL to render (e.g. photo uploaded from another device, or the
  // original file got evicted from cache). Batch-resolve them and keep
  // the map in state. Re-runs every 45 minutes so URLs never expire
  // while the app is open.
  const missingUrlKeys = useMemo(() => {
    const need: string[] = [];
    for (const p of state.photos) {
      if (!p.storageKey) continue;
      if (state.photoUrls[p.storageKey]) continue;
      need.push(p.storageKey);
    }
    return need;
  }, [state.photos, state.photoUrls]);

  useEffect(() => {
    if (!userId) return;
    if (missingUrlKeys.length === 0) return;
    let cancelled = false;
    (async () => {
      const fresh = await getPhotoViewUrls(missingUrlKeys);
      if (cancelled) return;
      if (Object.keys(fresh).length === 0) return;
      setState((prev) => ({ ...prev, photoUrls: { ...prev.photoUrls, ...fresh } }));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, missingUrlKeys]);

  // Periodic refresh (45 min) so URLs don't expire while the app is up.
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(
      () => {
        setState((prev) => ({ ...prev, photoUrls: {} })); // force re-resolve
      },
      45 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [userId]);

  // ---- Retry pending photo uploads --------------------------------------
  // Photos captured before sign-in (or while R2 credentials were still
  // being set up) end up with a local uri but no storageKey. Once the
  // user is signed in, walk that backlog and try to upload each one.
  // Best-effort: one pass per sign-in session, sequential to avoid
  // overloading the free-tier edge function concurrency.
  useEffect(() => {
    if (!userId) return;
    const pending = state.photos.filter(
      (p) => !p.storageKey && p.uri && (p.uri.startsWith('blob:') || p.uri.startsWith('file://') || p.uri.startsWith('data:') || p.uri.startsWith('http')),
    );
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const p of pending) {
        if (cancelled) break;
        const result = await uploadPhotoToCloud(p.id, p.uri);
        if (cancelled || !result.ok) continue;
        const updated: Photo = { ...p, storageKey: result.storageKey };
        let nextList: Photo[] = [];
        setState((prev) => {
          nextList = prev.photos.map((x) => (x.id === p.id ? updated : x));
          return { ...prev, photos: nextList };
        });
        await PhotosStore.save(nextList);
        Cloud.pushPhoto(updated, userId);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run on sign-in and whenever the set of pending ids changes (new
    // photo added). Using length as proxy so we don't re-start mid-loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, state.photos.filter((p) => !p.storageKey).length]);

  // ---- Procedure helpers -----------------------------------------------
  const persistProcedures = useCallback(async (next: Procedure[]) => {
    await ProceduresStore.save(next);
  }, []);

  const addProcedure = useCallback<Actions['addProcedure']>(
    async (input) => {
      const procedure: Procedure = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      let nextList: Procedure[] = [];
      setState((prev) => {
        nextList = [...prev.procedures, procedure];
        return { ...prev, procedures: nextList };
      });
      await persistProcedures(nextList);
      // Schedule reminders if enabled
      if (state.profile.notificationsEnabled) {
        await rescheduleProcedure(procedure, true);
      }
      if (userId) Cloud.pushProcedure(procedure, userId);
      return procedure;
    },
    [persistProcedures, state.profile.notificationsEnabled, userId],
  );

  const updateProcedure = useCallback<Actions['updateProcedure']>(
    async (id, patch) => {
      let nextList: Procedure[] = [];
      let updated: Procedure | undefined;
      setState((prev) => {
        nextList = prev.procedures.map((p) => {
          if (p.id !== id) return p;
          updated = { ...p, ...patch };
          return updated;
        });
        return { ...prev, procedures: nextList };
      });
      await persistProcedures(nextList);
      if (updated && state.profile.notificationsEnabled) {
        await rescheduleProcedure(updated, !updated.archivedAt);
      }
      if (userId && updated) Cloud.pushProcedure(updated, userId);
    },
    [persistProcedures, state.profile.notificationsEnabled, userId],
  );

  const deleteProcedure = useCallback<Actions['deleteProcedure']>(
    async (id) => {
      let nextProcedures: Procedure[] = [];
      let nextLogs: ProcedureLog[] = [];
      setState((prev) => {
        nextProcedures = prev.procedures.filter((p) => p.id !== id);
        nextLogs = prev.procedureLogs.filter((l) => l.procedureId !== id);
        return { ...prev, procedures: nextProcedures, procedureLogs: nextLogs };
      });
      await Promise.all([
        ProceduresStore.save(nextProcedures),
        LogsStore.save(nextLogs),
      ]);
      // Cancel notifications for this procedure
      await rescheduleProcedure(
        { id, name: '', kinds: ['other'], targetZones: [], amount: 0, unit: '', frequencyPerDay: 0, reminderTimes: [], createdAt: '' },
        false,
      );
      if (userId) Cloud.deleteProcedure(id, userId);
    },
    [userId],
  );

  // ---- Procedure logs --------------------------------------------------
  const setProcedureCount = useCallback<Actions['setProcedureCount']>(
    async (procedureId, day, count) => {
      let nextLogs: ProcedureLog[] = [];
      let mutated: ProcedureLog | undefined;
      setState((prev) => {
        const existing = prev.procedureLogs.find(
          (l) => l.procedureId === procedureId && l.date === day,
        );
        if (existing) {
          mutated = { ...existing, count, updatedAt: new Date().toISOString() };
          nextLogs = prev.procedureLogs.map((l) => (l.id === existing.id ? mutated! : l));
        } else {
          mutated = {
            id: uid(),
            procedureId,
            date: day,
            count,
            updatedAt: new Date().toISOString(),
          };
          nextLogs = [...prev.procedureLogs, mutated];
        }
        return { ...prev, procedureLogs: nextLogs };
      });
      await LogsStore.save(nextLogs);
      if (userId && mutated) Cloud.pushProcedureLog(mutated, userId);
    },
    [userId],
  );

  const tickProcedure = useCallback<Actions['tickProcedure']>(
    async (procedureId, day) => {
      const procedure = state.procedures.find((p) => p.id === procedureId);
      if (!procedure) return;
      const log = state.procedureLogs.find(
        (l) => l.procedureId === procedureId && l.date === day,
      );
      const current = log?.count ?? 0;
      const next = current >= procedure.frequencyPerDay ? 0 : current + 1;
      await setProcedureCount(procedureId, day, next);
    },
    [setProcedureCount, state.procedures, state.procedureLogs],
  );

  // ---- Photos ----------------------------------------------------------
  const addPhoto = useCallback<Actions['addPhoto']>(
    async (input) => {
      const photo: Photo = {
        ...input,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      let nextList: Photo[] = [];
      setState((prev) => {
        nextList = [...prev.photos, photo];
        return { ...prev, photos: nextList };
      });
      await PhotosStore.save(nextList);
      // Push metadata first so the photo is known to the cloud even if
      // the upload is slow / offline. The `storage_key` stays null until
      // the R2 upload finishes.
      if (userId) {
        Cloud.pushPhoto(photo, userId);
        // Fire-and-forget R2 upload. On success we patch the photo
        // record with `storageKey`, re-save locally, and re-push to
        // Supabase so every device can now render the image from R2.
        uploadPhotoToCloud(photo.id, photo.uri).then(async (result) => {
          if (!result.ok) return;
          const updated: Photo = { ...photo, storageKey: result.storageKey };
          let patched: Photo[] = [];
          setState((prev) => {
            patched = prev.photos.map((p) => (p.id === photo.id ? updated : p));
            return { ...prev, photos: patched };
          });
          await PhotosStore.save(patched);
          Cloud.pushPhoto(updated, userId);
        });
      }
      return photo;
    },
    [userId],
  );

  const deletePhoto = useCallback<Actions['deletePhoto']>(
    async (id) => {
      let toDelete: Photo | undefined;
      let nextList: Photo[] = [];
      setState((prev) => {
        toDelete = prev.photos.find((p) => p.id === id);
        nextList = prev.photos.filter((p) => p.id !== id);
        return { ...prev, photos: nextList };
      });
      await PhotosStore.save(nextList);
      if (toDelete) await deletePhotoFile(toDelete.uri);
      if (userId) Cloud.deletePhoto(id, userId);
    },
    [userId],
  );

  // ---- Journal ---------------------------------------------------------
  const upsertJournal = useCallback<Actions['upsertJournal']>(
    async (input) => {
      const now = new Date().toISOString();
      let entry!: JournalEntry;
      let nextList: JournalEntry[] = [];
      setState((prev) => {
        const existing = input.id ? prev.journal.find((j) => j.id === input.id) : undefined;
        if (existing) {
          entry = { ...existing, ...input, id: existing.id, updatedAt: now };
          nextList = prev.journal.map((j) => (j.id === entry.id ? entry : j));
        } else {
          entry = {
            ...input,
            id: input.id ?? uid(),
            createdAt: now,
            updatedAt: now,
          };
          nextList = [...prev.journal, entry];
        }
        return { ...prev, journal: nextList };
      });
      await JournalStore.save(nextList);
      if (userId) Cloud.pushJournal(entry, userId);
      return entry;
    },
    [userId],
  );

  const deleteJournal = useCallback<Actions['deleteJournal']>(
    async (id) => {
      let nextList: JournalEntry[] = [];
      setState((prev) => {
        nextList = prev.journal.filter((j) => j.id !== id);
        return { ...prev, journal: nextList };
      });
      await JournalStore.save(nextList);
      if (userId) Cloud.deleteJournal(id, userId);
    },
    [userId],
  );

  // ---- Profile ---------------------------------------------------------
  const updateProfile = useCallback<Actions['updateProfile']>(async (patch) => {
    let nextProfile: UserProfile = state.profile;
    setState((prev) => {
      nextProfile = { ...prev.profile, ...patch };
      return { ...prev, profile: nextProfile };
    });
    await ProfileStore.set(nextProfile);

    // If notifications were toggled on, request permission and reschedule.
    if (patch.notificationsEnabled === true) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        for (const p of state.procedures) {
          await rescheduleProcedure(p, true);
        }
      }
    }
    if (patch.notificationsEnabled === false) {
      await cancelAllNotifications();
    }

    if (userId) Cloud.pushProfile(nextProfile, userId);
  }, [state.profile, state.procedures, userId]);

  // ---- Reset -----------------------------------------------------------
  const resetAll = useCallback(async () => {
    setState({ ...initialState, ready: true });
    await Promise.all([
      ProceduresStore.save([]),
      LogsStore.save([]),
      PhotosStore.save([]),
      JournalStore.save([]),
      ProfileStore.set(DEFAULT_PROFILE),
    ]);
    await cancelAllNotifications();
  }, []);

  const value = useMemo<State & Actions>(
    () => ({
      ...state,
      addProcedure,
      updateProcedure,
      deleteProcedure,
      setProcedureCount,
      tickProcedure,
      addPhoto,
      deletePhoto,
      upsertJournal,
      deleteJournal,
      updateProfile,
      resetAll,
    }),
    [
      state,
      addProcedure,
      updateProcedure,
      deleteProcedure,
      setProcedureCount,
      tickProcedure,
      addPhoto,
      deletePhoto,
      upsertJournal,
      deleteJournal,
      updateProfile,
      resetAll,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ---- Hooks ----------------------------------------------------------------
function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

export function useReady() {
  return useData().ready;
}

export function useProcedures() {
  const { procedures, addProcedure, updateProcedure, deleteProcedure } = useData();
  return { procedures, addProcedure, updateProcedure, deleteProcedure };
}

export function useProcedureLogs(day: DayKey = dayKey()) {
  const { procedureLogs, setProcedureCount, tickProcedure } = useData();
  return {
    logs: procedureLogs.filter((l) => l.date === day),
    allLogs: procedureLogs,
    setProcedureCount,
    tickProcedure,
  };
}

export function usePhotos() {
  const { photos, photoUrls, addPhoto, deletePhoto } = useData();
  /**
   * Return the best URI we have for a photo right now.
   *  - Local file/blob URIs are preferred (no network hit).
   *  - Otherwise a signed R2 URL if we've resolved one.
   *  - Otherwise null; callers can show a placeholder.
   */
  const resolveUri = (p: Photo): string | null => {
    if (p.uri && (p.uri.startsWith('file://') || p.uri.startsWith('blob:') || p.uri.startsWith('data:') || p.uri.startsWith('http'))) {
      return p.uri;
    }
    if (p.storageKey && photoUrls[p.storageKey]) return photoUrls[p.storageKey];
    return null;
  };
  return { photos, addPhoto, deletePhoto, photoUrls, resolveUri };
}

export function useJournal() {
  const { journal, upsertJournal, deleteJournal } = useData();
  return { journal, upsertJournal, deleteJournal };
}

export function useProfile() {
  const { profile, updateProfile, resetAll } = useData();
  return { profile, updateProfile, resetAll };
}

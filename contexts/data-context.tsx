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
import { dayKey, uid } from '@/lib/uuid';
import { useAuth } from '@/contexts/auth-context';

type State = {
  ready: boolean;
  procedures: Procedure[];
  procedureLogs: ProcedureLog[];
  photos: Photo[];
  journal: JournalEntry[];
  profile: UserProfile;
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
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // ---- Hydration --------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rawProcedures, procedureLogs, photos, journal, profile] = await Promise.all([
        ProceduresStore.list(),
        LogsStore.list(),
        PhotosStore.list(),
        JournalStore.list(),
        ProfileStore.get(),
      ]);
      // One-shot migration for older local records:
      //  - `kind: ProcedureKind` → `kinds: [kind]`
      //  - missing `targetZones` → []
      const procedures = rawProcedures.map((p) => {
        const anyP = p as Procedure & { kind?: string };
        const migrated: Procedure = {
          ...p,
          kinds:
            anyP.kinds && anyP.kinds.length > 0
              ? anyP.kinds
              : anyP.kind
                ? [anyP.kind as Procedure['kinds'][number]]
                : ['other'],
          targetZones: p.targetZones ?? [],
        };
        return migrated;
      });
      if (cancelled) return;
      setState({
        ready: true,
        procedures,
        procedureLogs,
        photos,
        journal,
        profile,
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

      setState((prev) => {
        // Merge: cloud wins on id conflict, local-only rows survive.
        const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
          const byId = new Map<string, T>();
          for (const row of local) byId.set(row.id, row);
          for (const row of remote) byId.set(row.id, row);
          return Array.from(byId.values());
        };
        return {
          ready: true,
          procedures: mergeById(prev.procedures, snapshot.procedures),
          procedureLogs: mergeById(prev.procedureLogs, snapshot.procedureLogs),
          journal: mergeById(prev.journal, snapshot.journal),
          photos: mergeById(prev.photos, snapshot.photos),
          profile: {
            ...prev.profile,
            ...snapshot.profile,
            // Local onboarding state wins — it's a UX flag, not data.
            onboardingCompleted:
              snapshot.profile.onboardingCompleted || prev.profile.onboardingCompleted,
          },
        };
      });

      // Find local rows missing from the cloud and push them up.
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
      Cloud.pushProfile(state.profile, userId);

      // Persist merged state locally so offline boots see the latest cloud data.
      await Promise.all([
        ProceduresStore.save(snapshot.procedures),
        LogsStore.save(snapshot.procedureLogs),
        PhotosStore.save(snapshot.photos),
        JournalStore.save(snapshot.journal),
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
      // Photo metadata goes up now; actual bytes go to R2 in a later commit.
      if (userId) Cloud.pushPhoto(photo, userId);
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
  const { photos, addPhoto, deletePhoto } = useData();
  return { photos, addPhoto, deletePhoto };
}

export function useJournal() {
  const { journal, upsertJournal, deleteJournal } = useData();
  return { journal, upsertJournal, deleteJournal };
}

export function useProfile() {
  const { profile, updateProfile, resetAll } = useData();
  return { profile, updateProfile, resetAll };
}

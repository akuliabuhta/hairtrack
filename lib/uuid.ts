/**
 * Lightweight UUID-ish ID generator. We don't need cryptographic uniqueness
 * — just collision-free local IDs for SQLite-row-style records.
 *
 * Format: `<base36 timestamp>-<6 random chars>` — sortable by creation time
 * and short enough to read in dev tools.
 */
export function uid(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${time}-${rand}`;
}

/** Day-bucket key for the current local date or a given date. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse 'YYYY-MM-DD' as a local-midnight Date (avoids UTC drift). */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

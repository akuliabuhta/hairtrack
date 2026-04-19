/**
 * ID and date helpers.
 *
 * `uid()` used to produce a short base36 string, which was readable in
 * dev tools but incompatible with PostgreSQL's `uuid` column type — our
 * Supabase sync kept failing with `invalid input syntax for type uuid`.
 * We now emit RFC 4122 v4 strings so IDs round-trip to cloud without
 * extra mapping.
 */

/** RFC 4122 v4 UUID. Prefers native `crypto.randomUUID`; falls back to a
 *  Math.random-based implementation for older runtimes. Not intended to
 *  be cryptographically unique — just collision-free in practice. */
export function uid(): string {
  const c: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // Fallback (e.g. very old RN runtimes).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true iff the string is a canonical UUID. */
export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
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

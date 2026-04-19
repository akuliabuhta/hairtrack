-- Migration 002: split `kind` (single) → `kinds` (array)
--
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
-- The app now lets a user pick multiple procedure kinds at once
-- (e.g. лосьон + дермароллер as a single routine).

-- 1. Drop the single-value check constraint so we can add 'lotion' etc.
alter table public.procedures drop constraint if exists procedures_kind_check;

-- 2. Add the new column with a safe default.
alter table public.procedures
  add column if not exists kinds text[] not null default array[]::text[];

-- 3. Backfill from the old column where we haven't done so yet.
update public.procedures
  set kinds = array[kind]
  where kinds = array[]::text[] and kind is not null;

-- 4. Fallback so no row is left with an empty kinds array.
update public.procedures
  set kinds = array['other']
  where kinds = array[]::text[];

-- 5. Constrain each element to the known set. New 'lotion' is included.
alter table public.procedures drop constraint if exists procedures_kinds_values_check;
alter table public.procedures
  add constraint procedures_kinds_values_check
  check (
    kinds <@ array['lotion','spray','pill','massage','derma-roller','shampoo','oil','other']::text[]
    and array_length(kinds, 1) >= 1
  );

-- 6. Drop the legacy single-value column.
alter table public.procedures drop column if exists kind;

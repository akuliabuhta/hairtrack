-- Migration 003: add per-procedure `target_zones`
--
-- A single treatment (e.g. Vikinord) can be applied to multiple body
-- zones — head + beard + brows. We now store that on the procedure so
-- cards across the app can show the zones and later filter by them.
--
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.

alter table public.procedures
  add column if not exists target_zones text[] not null default array[]::text[];

-- Constrain each element to the known Goal set.
alter table public.procedures drop constraint if exists procedures_target_zones_values_check;
alter table public.procedures
  add constraint procedures_target_zones_values_check
  check (target_zones <@ array['head','beard','brows']::text[]);

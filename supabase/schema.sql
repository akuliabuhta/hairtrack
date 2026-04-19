-- HairTrack — initial Supabase schema
--
-- Run this in the SQL editor of your Supabase project once.
-- Safe to re-run: uses `if not exists` / `or replace` where possible.

-- =============================================================================
-- Extensions
-- =============================================================================
create extension if not exists "uuid-ossp";

-- =============================================================================
-- Profile (one row per auth user)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gender text check (gender in ('male','female','other')),
  goals text[] not null default array[]::text[],
  start_date date,
  onboarding_completed boolean not null default false,
  notifications_enabled boolean not null default true,
  daily_summary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- Procedures (treatment plan)
-- =============================================================================
create table if not exists public.procedures (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- Multi-select: a single routine can combine e.g. лосьон + дермароллер.
  kinds text[] not null default array['other']::text[],
  -- Which body zones this treatment is applied to (same 3-value set as
  -- onboarding goals). Empty array = not zone-specific (e.g. vitamin).
  target_zones text[] not null default array[]::text[],
  amount numeric not null default 1,
  unit text not null default 'раз',
  frequency_per_day int not null default 1 check (frequency_per_day between 1 and 12),
  reminder_times text[] not null default array[]::text[],
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint procedures_kinds_values_check check (
    kinds <@ array['lotion','spray','pill','massage','derma-roller','shampoo','oil','other']::text[]
    and array_length(kinds, 1) >= 1
  ),
  constraint procedures_target_zones_values_check check (
    target_zones <@ array['head','beard','brows']::text[]
  )
);
create index if not exists procedures_user_idx on public.procedures(user_id);

-- =============================================================================
-- Procedure logs (per-day completion counts)
-- =============================================================================
create table if not exists public.procedure_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  procedure_id uuid not null references public.procedures(id) on delete cascade,
  log_date date not null,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  unique (procedure_id, log_date)
);
create index if not exists procedure_logs_user_date_idx on public.procedure_logs(user_id, log_date);

-- =============================================================================
-- Photos (metadata; binary lives in Cloudflare R2 / later Supabase Storage)
-- =============================================================================
create table if not exists public.photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text,         -- path in the bucket once uploaded, e.g. 'u/<uid>/<photoId>.jpg'
  local_uri text,           -- file:// URI while photo is on-device only
  log_date date not null,
  zone text not null check (zone in ('crown','hairline','temples','side','beard','brows','other')),
  note text,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists photos_user_date_idx on public.photos(user_id, log_date);

-- =============================================================================
-- Journal entries
-- =============================================================================
create table if not exists public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  text text not null default '',
  mood text check (mood in ('good','neutral','bad')),
  symptoms text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);
create index if not exists journal_user_date_idx on public.journal_entries(user_id, log_date);

-- =============================================================================
-- updated_at triggers
-- =============================================================================
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists procedures_touch on public.procedures;
create trigger procedures_touch before update on public.procedures
  for each row execute function public.touch_updated_at();

drop trigger if exists procedure_logs_touch on public.procedure_logs;
create trigger procedure_logs_touch before update on public.procedure_logs
  for each row execute function public.touch_updated_at();

drop trigger if exists journal_entries_touch on public.journal_entries;
create trigger journal_entries_touch before update on public.journal_entries
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- Row-level security — each user only sees / mutates their own data.
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.procedures enable row level security;
alter table public.procedure_logs enable row level security;
alter table public.photos enable row level security;
alter table public.journal_entries enable row level security;

-- Profiles: the user can read/update their own row. Row is created via the
-- `on_auth_user_created` trigger below (defensive) or explicitly by the app.
drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: self upsert" on public.profiles;
create policy "profiles: self upsert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Generic per-user-row policies (same pattern for every other table).
do $$
declare
  tbl text;
begin
  foreach tbl in array array['procedures','procedure_logs','photos','journal_entries']
  loop
    execute format('drop policy if exists "%s: self all" on public.%s', tbl, tbl);
    execute format(
      'create policy "%s: self all" on public.%s
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)',
      tbl, tbl
    );
  end loop;
end $$;

-- =============================================================================
-- Auto-create profile row on sign-up
-- =============================================================================
create or replace function public.handle_new_user() returns trigger
  security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end $$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

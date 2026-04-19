-- Migration 004: AI analysis results
--
-- Each analysis is one pass over 3 photos (crown / hairline / side)
-- through Claude Vision. We keep the structured result so the user can
-- revisit past analyses and compare over time.

create table if not exists public.analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- storage_keys of the photos that went in, in prompt order
  photo_keys text[] not null,
  -- LLM interpretation
  norwood_stage smallint check (norwood_stage between 1 and 7),
  ludwig_stage smallint check (ludwig_stage between 1 and 3),
  density_pct smallint check (density_pct between 0 and 100),
  weak_zone text check (weak_zone in ('crown','hairline','temples','side','beard','brows','other')),
  asymmetry_pct smallint check (asymmetry_pct between 0 and 100),
  overall_score smallint check (overall_score between 0 and 100),
  summary text,
  recommendations text[] not null default array[]::text[],
  -- the full raw JSON, in case we want to inspect later
  raw_response jsonb,
  model text not null default 'claude-sonnet-4-5',
  status text not null default 'completed' check (status in ('pending','completed','failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_created_idx on public.analyses(user_id, created_at desc);

-- Row-level security — same pattern as other tables.
alter table public.analyses enable row level security;

drop policy if exists "analyses: self all" on public.analyses;
create policy "analyses: self all" on public.analyses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

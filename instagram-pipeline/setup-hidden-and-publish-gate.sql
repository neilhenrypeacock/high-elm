-- Admin hide controls + the Monday publish gate.
--
-- STATUS: APPLIED to production (project dndefddhocxqczinfpfg) on 2026-07-30.
-- Kept here for the record and for rebuilding the schema from scratch. Every
-- statement is idempotent, so re-running is safe.
--
-- WHY hidden is NOT tracked:
--   hotels.tracked is the PIPELINE'S SCRAPING SCOPE. Reusing it to hide a hotel
--   from the dashboard would silently stop collecting that hotel's data, and
--   un-hiding it months later would leave an unfillable hole in its history.
--   hotels.hidden is purely editorial — the scraper keeps working.
--
-- WHAT hiding means:
--   FULL exclusion. lib/data.ts filters hidden posts and hidden hotels out at
--   load, so they never reach a baseline, a median, a breakout count, the
--   leaderboard or the What's Working buckets. No figure can then disagree with
--   what's on screen.

alter table public.standout_posts add column if not exists hidden boolean not null default false;
alter table public.hotels         add column if not exists hidden boolean not null default false;

-- One row (id = true) holding the publish cutoff. Members only see posts dated
-- at or before it; /admin sees through it. Seeded to now() so the gate starts
-- OPEN — nothing changes for members until the first Publish.
create table if not exists public.dashboard_settings (
  id             boolean primary key default true check (id),
  publish_cutoff timestamptz not null default now(),
  published_at   timestamptz not null default now()
);

insert into public.dashboard_settings (id) values (true) on conflict (id) do nothing;

-- ⚠ RLS on every new public table — without it the anon key can read AND write.
-- Read-only for anon (the dashboard needs to read the cutoff); no write policy,
-- so only the service-role key (which bypasses RLS) can move the gate.
alter table public.dashboard_settings enable row level security;
drop policy if exists "anon read dashboard_settings" on public.dashboard_settings;
create policy "anon read dashboard_settings" on public.dashboard_settings for select to anon using (true);

-- Verify:
--   select * from public.dashboard_settings;
--   select table_name, column_name from information_schema.columns
--     where table_schema = 'public' and column_name = 'hidden';

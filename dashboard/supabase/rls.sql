-- Content Radar dashboard — read-only access for the anon key
--
-- HOW TO APPLY (one-time, ~2 minutes):
--   1. Supabase dashboard → SQL Editor → paste this whole file → Run.
--   2. Project Settings → API → copy the `anon` (public) key.
--   3. Add SUPABASE_ANON_KEY=<key> to dashboard/.env.local AND to the
--      Vercel project env vars, then redeploy.
--   4. Optional hygiene: also record it in keys/.env.supabase.
--
-- The pipeline (../instagram-pipeline/) keeps using the service-role key,
-- which bypasses RLS entirely — enabling RLS does not affect its writes.
--
-- Result: the dashboard's key can SELECT these five tables and nothing else.
-- No INSERT/UPDATE/DELETE policies exist for anon, so writes are refused.

alter table public.hotels            enable row level security;
alter table public.profile_snapshots enable row level security;
alter table public.posts             enable row level security;
alter table public.standout_posts    enable row level security;
alter table public.insights          enable row level security;

drop policy if exists "anon read hotels"            on public.hotels;
drop policy if exists "anon read profile_snapshots" on public.profile_snapshots;
drop policy if exists "anon read posts"             on public.posts;
drop policy if exists "anon read standout_posts"    on public.standout_posts;
drop policy if exists "anon read insights"          on public.insights;

create policy "anon read hotels"            on public.hotels            for select to anon using (true);
create policy "anon read profile_snapshots" on public.profile_snapshots for select to anon using (true);
create policy "anon read posts"             on public.posts             for select to anon using (true);
create policy "anon read standout_posts"    on public.standout_posts    for select to anon using (true);
create policy "anon read insights"          on public.insights          for select to anon using (true);

-- Verify (should list the five policies):
-- select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public';

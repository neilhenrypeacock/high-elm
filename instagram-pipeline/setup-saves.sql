-- Content Radar — Save (posts) + Watchlist (hotels) storage
-- Run once in the Supabase SQL editor. Idempotent. RLS ON — each user sees only their own rows.
-- Keyed to the authenticated Supabase Auth user (auth.uid()), matching the magic-link login.
-- (Ran manually by Neil 2026-07-09.)

-- ── Saved posts (a user's swipe file of breakout posts) ──────────────────────
create table if not exists public.saved_posts (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  -- the dashboard identifies a post by the composite (post_id, instagram_handle)
  post_id           text not null,
  instagram_handle  text not null,
  -- snapshot of the post's display fields at save time, so Saved renders even
  -- after the post drops out of the live 7d/30d breakout window (it's a keepsake)
  post              jsonb not null,
  created_at        timestamptz not null default now(),
  unique (user_id, post_id, instagram_handle)
);
alter table public.saved_posts enable row level security;
create policy "saved_posts: read own"   on public.saved_posts for select using (auth.uid() = user_id);
create policy "saved_posts: insert own" on public.saved_posts for insert with check (auth.uid() = user_id);
create policy "saved_posts: delete own" on public.saved_posts for delete using (auth.uid() = user_id);
create index if not exists saved_posts_user_idx on public.saved_posts (user_id, created_at desc);

-- ── Watchlist hotels (hotels a user follows) ─────────────────────────────────
create table if not exists public.watchlist_hotels (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  instagram_handle  text not null,               -- re-joined to live leaderboard data on render
  hotel_name        text,                         -- cached for a display fallback
  created_at        timestamptz not null default now(),
  unique (user_id, instagram_handle)
);
alter table public.watchlist_hotels enable row level security;
create policy "watchlist: read own"   on public.watchlist_hotels for select using (auth.uid() = user_id);
create policy "watchlist: insert own" on public.watchlist_hotels for insert with check (auth.uid() = user_id);
create policy "watchlist: delete own" on public.watchlist_hotels for delete using (auth.uid() = user_id);
create index if not exists watchlist_user_idx on public.watchlist_hotels (user_id, created_at desc);

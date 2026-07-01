-- High Elm Instagram Pipeline — Table Setup
-- Run this once in the Supabase SQL Editor.

-- SHELF 2: Profile Snapshots
-- One new row per hotel per scrape run. Stack of dated rows = growth tracking.
create table if not exists profile_snapshots (
  id               bigint generated always as identity primary key,
  instagram_handle text not null,
  captured_at      timestamptz not null default now(),
  followers_count  bigint,
  follows_count    bigint,
  posts_count      integer,
  full_name        text,
  biography        text,
  is_verified      boolean
);

-- SHELF 3: Posts
-- One row per post. Upsert on post_id prevents duplicates.
create table if not exists posts (
  id               bigint generated always as identity primary key,
  post_id          text unique,
  instagram_handle text not null,
  posted_at        timestamptz,
  captured_at      timestamptz not null default now(),
  type             text,
  likes_count      bigint,
  comments_count   bigint,
  caption          text,
  hashtags         text[],
  mentions         text[],
  post_url         text,
  image_url        text
);

-- Indexes for dashboard query performance
create index if not exists idx_profile_snapshots_handle on profile_snapshots(instagram_handle);
create index if not exists idx_profile_snapshots_captured_at on profile_snapshots(captured_at desc);
create index if not exists idx_posts_handle on posts(instagram_handle);
create index if not exists idx_posts_posted_at on posts(posted_at desc);

-- Run in Supabase SQL Editor

-- Per-post table: stores our own copy of the image + AI-generated insight and driver tag.
-- Keyed by post_id so each run upserts (overwrites) existing rows.
CREATE TABLE IF NOT EXISTS standout_posts (
  post_id          text PRIMARY KEY,
  stored_image_url text,
  post_insight     text,
  driver_tag       text,
  updated_at       timestamptz default now() not null
);

-- Add takeaways to the insights table (3 one-liners alongside the prose paragraph).
ALTER TABLE insights ADD COLUMN IF NOT EXISTS takeaways jsonb;

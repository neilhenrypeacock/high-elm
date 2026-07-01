-- Run once in Supabase SQL Editor to add the theme_tag column.
-- Safe to re-run — IF NOT EXISTS is idempotent.
ALTER TABLE standout_posts ADD COLUMN IF NOT EXISTS theme_tag text;

-- Run in the Supabase SQL editor. Idempotent.
--
-- ⚠ ORDERING: run this BEFORE the next scrape and before generate-insight.js.
-- scrape.js now writes child_image_urls / video_url, and generate-insight.js
-- selects them — a missing column errors the upsert / the select.
--
-- Captures the FULL media of each post so the AI analysis can see the whole
-- carousel (every slide) and the whole video (sampled frames), not just the
-- cover. These are raw Instagram CDN URLs (they expire) — generate-insight.js
-- fetches them at insight time (run right after the scrape, while they're fresh)
-- and falls back to the stored cover image if a URL has died.

alter table public.posts
  add column if not exists child_image_urls text[],   -- carousel slide image URLs (null for non-carousels)
  add column if not exists video_url        text;      -- video/reel mp4 URL (null for non-videos)

-- Verify
select column_name, data_type
from information_schema.columns
where table_name = 'posts' and column_name in ('child_image_urls', 'video_url');

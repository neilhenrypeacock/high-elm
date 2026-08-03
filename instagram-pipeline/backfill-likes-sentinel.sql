-- Backfill: clean the likes_count = 3 sentinel (audit 2026-07-31, brief 02 Phase 2)
--
-- WHAT THIS IS. Through Jun/Jul 2026 the Apify post scraper returned
-- likesCount = 3 for posts whose like count Instagram hides (the 3-avatar
-- "liked by A, B and others" preview leaking through as data). 813 rows landed
-- in `posts` looking like genuine 3-like posts and poisoned 57 hotels'
-- baselines. The pipeline now normalises the sentinel to NULL at scrape time
-- (scrape.js → likes.js); this script cleans the rows already stored.
--
-- ⚠ HONEST CAVEAT: any GENUINE 3-like post is caught too. Given the
-- distribution (813 rows at exactly 3, versus 0–4 rows each at 0, 1, 2, 4 and
-- 5 likes) that is a handful of rows at most, and there is no way to tell them
-- apart. A real 3-like post carries no signal for any figure we compute, so
-- the loss is accepted.
--
-- NULL is the existing convention for "no readable like count" — the app and
-- every pipeline script already exclude it from all engagement maths.
--
-- Run the three statements IN ORDER and check the counts:

-- 1) BEFORE — expect 813 (or slightly more if a scrape ran since 31 Jul 2026):
SELECT count(*) AS rows_at_3 FROM posts WHERE likes_count = 3;

-- 2) THE BACKFILL — narrow on purpose: only rows at exactly 3.
UPDATE posts SET likes_count = NULL WHERE likes_count = 3;

-- 3) AFTER — both checks in one result:
--    rows_still_at_3 must be 0; null_rows should have grown by the step-1 count
--    (it was 952 on 31 Jul 2026, so expect ≈ 1,765).
SELECT
  (SELECT count(*) FROM posts WHERE likes_count = 3)       AS rows_still_at_3,
  (SELECT count(*) FROM posts WHERE likes_count IS NULL)   AS null_rows;

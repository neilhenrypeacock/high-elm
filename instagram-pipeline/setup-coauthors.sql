-- Store Instagram's native co-author tag on each post.
--
-- A true Instagram "collab" post (the "X and Y" byline) carries the partner
-- accounts in the scraper's `coauthorProducers` field. That is ground truth —
-- unlike the caption/cross-grid heuristics it also catches collabs with
-- UNTRACKED accounts (galleries, photographers, brands). We store the partner
-- handles as a lowercased text[] so the dashboard can flag `is_collab` reliably
-- (and, later, show who the collab is with).
--
-- Backward compatible: nullable column, no default needed (absent = unknown /
-- scraped before this field was captured). The dashboard treats null/empty as
-- "no native collab signal" and falls back to the existing heuristics.
-- Reversible: `alter table public.posts drop column coauthor_usernames;`
--
-- ⚠ ORDERING: run this in the Supabase SQL editor BEFORE deploying the dashboard
-- change that selects this column — the dashboard's posts query lists columns
-- explicitly, so selecting a column that does not yet exist would error.
--
-- Run in the Supabase SQL editor.

alter table public.posts
  add column if not exists coauthor_usernames text[];

-- Verify (expect coauthor_usernames listed as ARRAY / text[])
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'posts'
  and column_name = 'coauthor_usernames';

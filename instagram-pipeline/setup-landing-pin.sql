-- Run in the Supabase SQL editor. Idempotent.
--
-- ⚠ ORDERING: run this BEFORE deploying the dashboard build that selects
-- landing_pin. getPortfolioData reads standout_posts.landing_pin, and querying
-- a column that doesn't exist yet errors the whole standout fetch (same trap as
-- editors_pick / coauthor_usernames).
--
-- Adds a manual "feature on the homepage" flag to standout_posts. A pinned post
-- is forced to the front of the public landing-page taster (the hero card stack
-- + open cards), overriding the usual "best non-collab breakouts of the last 30
-- days" rule — so an admin can hand-pick which posts greet a visitor. Any
-- breakout can be pinned, regardless of age or collab status. Set per post via
-- the /admin editorial page, or set-insight.js --feature / --unfeature.

alter table public.standout_posts
  add column if not exists landing_pin boolean not null default false;

-- Verify
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'standout_posts' and column_name = 'landing_pin';

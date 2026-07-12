-- Run in the Supabase SQL editor. Idempotent.
--
-- ⚠ ORDERING: run this BEFORE deploying the dashboard build that selects
-- editors_pick. getPortfolioData reads standout_posts.editors_pick, and querying
-- a column that doesn't exist yet errors the whole standout fetch (same trap as
-- the coauthor_usernames rollout).
--
-- Adds a manual "editor's pick" curation flag to standout_posts — a post worth
-- replicating, surfaced as a subtle badge on the breakout card. Set per post via
-- set-insight.js (or the weekly conversational flow).

alter table public.standout_posts
  add column if not exists editors_pick boolean not null default false;

-- Verify
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'standout_posts' and column_name = 'editors_pick';

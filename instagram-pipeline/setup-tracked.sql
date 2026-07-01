-- Tracked-hotels flag (beta: the 200 most-followed hotels)
--
-- Adds hotels.tracked and sets it for the 200 handles with the highest
-- latest follower count. The other hotels stay in the database untouched —
-- they are simply not scraped and not shown on the dashboard.
--
-- To expand coverage later: raise the LIMIT and re-run, or hand-flip
-- individual hotels:  update hotels set tracked = true where id = ...;
--
-- Run in the Supabase SQL editor. Idempotent.

alter table public.hotels add column if not exists tracked boolean not null default false;

with latest as (
  select distinct on (instagram_handle) instagram_handle, followers_count
  from public.profile_snapshots
  order by instagram_handle, captured_at desc, id desc
),
top200 as (
  select instagram_handle
  from latest
  where followers_count is not null
  order by followers_count desc
  limit 200
)
update public.hotels h
set tracked = (h.instagram_handle in (select instagram_handle from top200));

-- Verify
select count(*) filter (where tracked)                            as tracked_rows,
       count(distinct instagram_handle) filter (where tracked)    as tracked_handles,
       count(*)                                                   as total_rows
from public.hotels;

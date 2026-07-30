-- Split the single 'Americas' region into three destinations.
--
-- STATUS: APPLIED to production (project dndefddhocxqczinfpfg) on 2026-07-30.
--
-- WHY THREE, not the two Neil first asked for: a strict north/south split puts
-- every Caribbean island (Anguilla, St Barts, Cayman, Puerto Rico, St Lucia,
-- Jamaica) into "North America", which is not how luxury travel reads. That
-- would have made it 61 tracked hotels north vs 7 south. Neil chose the 3-way
-- split on 2026-07-30.
--
-- Result (tracked hotels):
--   North America                52   US 35, Mexico 16, Canada 1
--   Central America & Caribbean    9   Anguilla 2, St Barts 2, Cayman 1,
--                                      Puerto Rico 1, St Lucia 1, Jamaica 1,
--                                      Costa Rica 1
--   South America                  7   Brazil 5, Ecuador 1, Chile 1
--
-- NOTE: nothing in the app hardcodes region names — both the Top-posts
-- destination filter and the leaderboard region filter derive their options from
-- whatever the tracked hotels carry. So this SQL alone changes the UI.
--
-- The country lists below deliberately include countries with no hotels yet, so
-- the mapping still holds when coverage expands.
--
-- ⚠ The `hotels` table also still holds legacy 'Asia' (35 rows) and 'Oceania'
-- (1 row) values on UNTRACKED hotels, left over from an earlier import. They are
-- invisible today (the dashboard only reads tracked=true), but if any of those
-- hotels is ever tracked, the filter would show 'Asia' AND 'Asia-Pacific' as
-- separate destinations. Fold them into 'Asia-Pacific' before expanding
-- coverage. NOT done here — out of scope for this change.

update public.hotels set region = 'North America'
 where region = 'Americas' and country in ('United States','USA','Mexico','Canada');

update public.hotels set region = 'Central America & Caribbean'
 where region = 'Americas' and country in (
   'Costa Rica','Guatemala','Belize','Panama','Honduras','Nicaragua','El Salvador',
   'Anguilla','St Barts','St Barthélemy','Cayman Islands','Saint Lucia','St Lucia',
   'Grenada','Bahamas','Puerto Rico','Antigua and Barbuda','Turks & Caicos',
   'Saint Vincent and the Grenadines','Jamaica','British Virgin Islands','Barbados',
   'Dominican Republic','Aruba','Curaçao','Bermuda','St Kitts and Nevis','Trinidad and Tobago');

update public.hotels set region = 'South America'
 where region = 'Americas' and country in (
   'Brazil','Colombia','Ecuador','Chile','Bolivia','Peru','Uruguay','Argentina',
   'Paraguay','Venezuela','Guyana','Suriname');

-- Verify: expect no 'Americas' row, and the three regions above.
--   select region, count(*) rows, count(*) filter (where tracked) tracked
--     from public.hotels group by region order by tracked desc;
--
-- Any hotel left on 'Americas' means its country isn't in the lists above —
-- add it rather than leaving the row stranded:
--   select distinct country from public.hotels where region = 'Americas';

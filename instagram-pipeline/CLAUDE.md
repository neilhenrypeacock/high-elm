# Instagram Pipeline — Session Context

## What this repo is
A Node.js (ESM) script that scrapes Instagram data for ~465 luxury hotels using Apify, then writes results to Supabase. It is run **manually** — there is no scheduled job or CI. The dashboard at `../dashboard/` reads the data this pipeline writes.

## How to run

**Test run (5 hotels, for smoke-testing):**
```bash
npm run test5
```

**Full run (all TRACKED hotels, batches of 50):**
```bash
npm run full
```
Scrapes only hotels with `tracked = true` (beta: the 200 most-followed — set by `setup-tracked.sql`). `POSTS_PER_HOTEL` in `full-run.js` fetches each hotel's **last 30 posts** (count-based, not a time window) — those 30 posts are the dashboard's breakout baseline. To widen coverage, flip more hotels to tracked and re-run.

**Re-run skipped handles:**
```bash
node remaining-handles.js
```

## Required env vars (in `.env` — do NOT commit)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APIFY_TOKEN=
```
Credentials are also documented in `../keys/README.md`.

## Key files
| File | Purpose |
|---|---|
| `scrape.js` | Core pipeline: calls Apify actors, normalises data, uploads images, writes to Supabase |
| `full-run.js` | Runs scrape across all hotel handles in batches of 50 |
| `test-run.js` | Runs scrape for 5 handles only (smoke test) |
| `remaining-handles.js` | Re-runs handles that returned no data (e.g. after Apify top-up) |
| `setup-tables.sql` | SQL to create Supabase tables (already run — do not re-run) |
| `setup-standout-posts.sql` | SQL for standout_posts table (already run) |
| `setup-tracked.sql` | Adds/refreshes hotels.tracked = top-200 by followers (idempotent; run 2026-07-01) |
| `generate-insight.js` | Per-post insights + driver/theme tags → standout_posts (weekly prose generation REMOVED 2026-07-01 — dashboard never displayed it) |

## Apify actors used
- `apify/instagram-profile-scraper` — follower counts, bio → `profile_snapshots`
- `apify/instagram-post-scraper` — likes, comments, captions, dates → `posts`

## Image storage
Post images are downloaded and uploaded to the **`standout-images`** Supabase Storage bucket (public). The stored URL is saved to `standout_posts.stored_image_url`. Falls back to raw Instagram CDN URL if upload fails.

## Supabase tables written
- `profile_snapshots` — one new row per scrape per hotel (INSERT, not upsert)
- `posts` — upserted on `post_id`; duplicate posts are updated in place
- `standout_posts` — written separately (see `add-theme-tag.sql`, `backfill-themes.js`)

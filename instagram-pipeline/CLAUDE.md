# Instagram Pipeline — Session Context

## What this repo is
A Node.js (ESM) script that scrapes Instagram data for luxury hotels using Apify, then writes results to Supabase. It is run **manually** — there is no scheduled job or CI. The dashboard at `../hotel-dashboard/` reads the data this pipeline writes. (The `hotels` table holds 465 hotels; only the ~205 with `tracked = true` are scraped.)

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

**Re-runs are safe:** posts upsert on the composite key and profile snapshots dedupe per UTC day (added 2026-07-09), so retrying a failed batch the same day cannot create duplicates. `full-run.js` prints skipped handles at the end — re-run those by editing the list in `test-run.js`. (The old `remaining-handles.js` with its stale hardcoded list was removed 2026-07-09.)

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
| `check-images.js` / `audit-post-counts.js` | Read-only diagnostics (image coverage / posts per hotel) |
| `backfill-themes.js` | Ad-hoc AI theme-tag backfill for standout_posts |
| `setup-tables.sql` | SQL to create Supabase tables (already run — do not re-run) |
| `setup-standout-posts.sql` | SQL for standout_posts table (already run) |
| `setup-tracked.sql` | Adds/refreshes hotels.tracked = top-200 by followers (idempotent; run 2026-07-01) |
| `generate-insight.js` | Per-post insights + driver/theme tags → standout_posts (weekly prose generation REMOVED 2026-07-01 — dashboard never displayed it) |

## Apify actors used
- `apify/instagram-profile-scraper` — follower counts, bio → `profile_snapshots`
- `apify/instagram-post-scraper` — likes, comments, captions, dates → `posts`

## Image storage
Post images are downloaded and uploaded to the **`standout-images`** Supabase Storage bucket (public) at scrape time. The permanent URL is written to **`posts.image_url`** (scrape.js); `standout_posts.stored_image_url` is only written by `generate-insight.js` for its 15 featured posts. Falls back to the raw Instagram CDN URL (which expires) only if the upload fails.

## Hidden like counts
Instagram hides likes on some posts/accounts. Apify returns those as `likes_count = null` (the bulk — heavily carousels); a small number of older rows use `-1`. The dashboard's `hasVisibleLikes` excludes **both** from every engagement calculation.

## Supabase tables written
- `profile_snapshots` — one new row per scrape per hotel (INSERT; deduped per UTC day on re-runs, 2026-07-09)
- `posts` — upserted on `(post_id, instagram_handle)`. Collab/co-posts are KEPT (no owner filter): a co-post appears on each partner's grid and is stored once per grid so each hotel measures it against its own baseline. Composite key applied via setup-composite-post-key.sql.
- `standout_posts` — written separately (see `add-theme-tag.sql`, `backfill-themes.js`)

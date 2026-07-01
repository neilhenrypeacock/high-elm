# Instagram Pipeline — Session Context

## What this repo is
A Node.js (ESM) script that scrapes Instagram data for ~465 luxury hotels using Apify, then writes results to Supabase. It is run **manually** — there is no scheduled job or CI. The dashboard at `../dashboard/` reads the data this pipeline writes.

## How to run

**Test run (5 hotels, for smoke-testing):**
```bash
npm run test5
```

**Full run (all hotels, batches of 50):**
```bash
npm run full
```
Takes ~90 minutes and costs ~$5 on Apify. The `POST_WINDOW` variable in `full-run.js` controls how far back posts are fetched (currently `'14 days'`; set to `'7 days'` for weekly top-ups).

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

## Apify actors used
- `apify/instagram-profile-scraper` — follower counts, bio → `profile_snapshots`
- `apify/instagram-post-scraper` — likes, comments, captions, dates → `posts`

## Image storage
Post images are downloaded and uploaded to the **`standout-images`** Supabase Storage bucket (public). The stored URL is saved to `standout_posts.stored_image_url`. Falls back to raw Instagram CDN URL if upload fails.

## Supabase tables written
- `profile_snapshots` — one new row per scrape per hotel (INSERT, not upsert)
- `posts` — upserted on `post_id`; duplicate posts are updated in place
- `standout_posts` — written separately (see `add-theme-tag.sql`, `backfill-themes.js`)

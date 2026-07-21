# High Elm — Instagram Pipeline

Collects public Instagram data for the luxury hotels tracked by Hotel Content Radar and stores it in Supabase. Runs on a **two-tier GitHub Actions schedule** — a cheap **weekly** incremental (`weekly-scrape.yml`, Mondays 05:00 UTC, last 10 days) plus a **monthly** deep-sweep (`monthly-scrape.yml`, 1st of the month, last 35 days) — with a manual-only **full** baseline rebuild (`full-scrape.yml`). All three are thin callers of the reusable `scrape-pipeline.yml`; each run costs real Apify money. A daily `freshness-check` workflow alarms when data goes stale (>8 days). Manual runs still work exactly as below.

## What it does

1. Runs two Apify actors in parallel for a batch of hotel handles:
   - `apify/instagram-profile-scraper` → follower counts, bio, verified status → `profile_snapshots` table
   - `apify/instagram-post-scraper` → likes, comments, captions, dates → `posts` table
2. Downloads each post's image into the public `standout-images` Supabase Storage bucket so the dashboard's image links never expire; `posts.image_url` stores the permanent URL (falls back to the raw Instagram CDN URL only if the upload fails).
3. Writes to Supabase. Posts upsert on the composite **(post_id, instagram_handle)** — a co-post appears once per partner grid. Profiles insert one dated snapshot row per hotel per run, deduped per UTC day so same-day re-runs (e.g. retrying a failed batch) don't double up.

## Setup

1. Copy credentials into `.env` (never commit this file — see `../keys/README.md` for where they live):
   ```
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   APIFY_TOKEN=
   ```
2. Install dependencies: `npm install`

## How to run a scrape

**Test run (5 hotels, smoke test):**
```bash
npm run test5
```

**Scheduled scrapes (all TRACKED hotels — currently the ~205 most-followed, set by `setup-tracked.sql`):**
```bash
npm run weekly    # last 10 days  (SCRAPE_WINDOW_DAYS=10) — routine, runs Mondays
npm run monthly   # last 35 days  (SCRAPE_WINDOW_DAYS=35) — deep sweep, runs the 1st
npm run full      # 30 posts/hotel, no window (SCRAPE_FULL=1) — baseline rebuild, manual only
```
All run through `scrape-run.js` in batches of 50; the mode is chosen by env (see the top of that file). Windowed modes pull only posts newer than N days — history already accumulates in `posts` (upsert), so each run needs only the new deltas, which keeps cost inside the Apify prepaid (see `APIFY-COST.md`). `full` re-fetches each hotel's last 30 posts and costs ~$14–16, so it's manual-only. Costs real money on Apify. A batch that fails is skipped and reported at the end; re-running the same day is safe (posts upsert, snapshots dedupe).

The database holds 465 hotels; only those with `tracked = true` are scraped and shown on the dashboard. To widen coverage, flip more hotels to tracked (`setup-tracked.sql`) and re-run.

## Files

| File | Purpose |
|---|---|
| `scrape.js` | Core pipeline — calls Apify, normalises data, uploads images, writes to Supabase |
| `scrape-run.js` | All tracked hotels in batches of 50; three modes (`npm run weekly` / `monthly` / `full`) |
| `test-run.js` | 5-hotel smoke test (`npm run test5`) |
| `generate-insight.js` | Per-post AI insights + driver/theme tags → `standout_posts` (run manually; not part of the scrape run) |
| `check-freshness.js` | Read-only staleness alarm — runs after every scrape and in the daily `freshness-check` workflow (`FRESHNESS_MAX_DAYS`, default 8) |
| `check-images.js` | Read-only diagnostic — image URL coverage |
| `audit-post-counts.js` | Read-only diagnostic — valid posts per hotel |
| `backfill-themes.js` | Ad-hoc AI theme-tag backfill for `standout_posts` |
| `setup-*.sql` / `add-theme-tag.sql` | One-time table setup / migrations (all applied — do not re-run except idempotent `setup-tracked.sql`) |

## Supabase tables written

- **`profile_snapshots`** — one dated row per hotel per scrape day (INSERT, deduped per UTC day)
- **`posts`** — one row per post per grid, upserted on `(post_id, instagram_handle)`; collab/co-posts are kept, once per partner grid
- **`standout_posts`** — written by `generate-insight.js` / `backfill-themes.js`, not by the scrape

Note on likes: Instagram hides like counts on some posts/accounts. Apify returns those as `null` (the bulk — ~1,460 rows as of Jul 2026, heavily carousels) and older rows use `-1` (~33 rows). The dashboard excludes **both** from every engagement calculation (`hasVisibleLikes` in `../hotel-dashboard/lib/data.ts`).

Credentials reference: `../keys/README.md`

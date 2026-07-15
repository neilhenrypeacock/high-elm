# Instagram Pipeline — Session Context

## What this repo is
A Node.js (ESM) script that scrapes Instagram data for luxury hotels using Apify, then writes results to Supabase. It runs **weekly via GitHub Actions** (`.github/workflows/weekly-scrape.yml`, Mondays 05:00 UTC — each run costs real Apify money) and can also be run manually. The weekly run also calls `generate-insight.js` after the scrape to produce "why it worked" analysis for the current top 10 non-collab breakouts (needs the `ANTHROPIC_API_KEY` secret; the workflow installs ffmpeg for video-frame analysis). A daily `freshness-check.yml` workflow alarms when the newest post is older than 8 days (`check-freshness.js` fails the run so GitHub emails the owner; also emails ALERT_EMAIL via Resend once `RESEND_API_KEY` is set). The dashboard at `../hotel-dashboard/` reads the data this pipeline writes. (The `hotels` table holds 465 hotels; only the ~205 with `tracked = true` are scraped.)

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
| `setup-coauthors.sql` | Adds `posts.coauthor_usernames text[]` for native collab detection (run in Supabase SQL editor BEFORE deploying the dashboard select — 2026-07-12) |
| `setup-post-media.sql` | Adds `posts.child_image_urls text[]` + `posts.video_url text` for full carousel/video analysis (run in Supabase SQL editor BEFORE the next scrape + generate-insight) |
| `generate-insight.js` | Per-post editorial analysis (what it is / why it worked / try this) + driver/theme tags → standout_posts. **Claude Sonnet 5** Vision + adaptive thinking + structured output. Runs automatically in `weekly-scrape.yml` after the scrape (needs `ANTHROPIC_API_KEY`; the workflow installs ffmpeg). Targets the current **top 10 non-collab breakouts**, selected with the SAME rule as the dashboard — the breakout constants are DUPLICATED from `../hotel-dashboard/lib/data.ts` (last-30 median, 2× threshold, MIN_ENGAGEMENT 100, MIN_BASELINE_ENGAGEMENT 25, tracked-only, 7-day window) — keep the two in sync. Sees the WHOLE carousel (every slide via `posts.child_image_urls`) and the WHOLE video (frames sampled across it via **ffmpeg** from `posts.video_url`); falls back to the cover image if media/ffmpeg is unavailable. `post_insight` holds the composed 3-line note the dashboard's "Editor's note" card renders. Local runs need `brew install ffmpeg`. Weekly prose generation REMOVED 2026-07-01. |

## Apify actors used
- `apify/instagram-profile-scraper` — follower counts, bio → `profile_snapshots`
- `apify/instagram-post-scraper` — likes, comments, captions, dates, and the native
  co-author tag (`coauthorProducers`) → `posts`. `parseCoauthors` in scrape.js keeps the
  partner handles as a lowercased `coauthor_usernames text[]` (null when absent) — ~13% of
  posts carry one, and it catches collabs with UNTRACKED accounts the caption/cross-grid
  heuristics miss.

## Image storage
Post images are downloaded and uploaded to the **`standout-images`** Supabase Storage bucket (public) at scrape time. The permanent URL is written to **`posts.image_url`** (scrape.js); `standout_posts.stored_image_url` is written by `generate-insight.js` for its featured posts. Falls back to the raw Instagram CDN URL (which expires) only if the upload fails.

The **cover** is stored durably (it's shown on the dashboard). The **full media** for AI analysis is NOT stored permanently — scrape.js records the raw CDN URLs (`posts.child_image_urls`, `posts.video_url`), and generate-insight.js fetches them at insight time (run right after the scrape, while the URLs are fresh). If a URL has expired, the analysis falls back to the stored cover.

## Hidden like counts
Instagram hides likes on some posts/accounts. Apify returns those as `likes_count = null` (the bulk — heavily carousels); a small number of older rows use `-1`. The dashboard's `hasVisibleLikes` excludes **both** from every engagement calculation.

## Supabase tables written
- `profile_snapshots` — one new row per scrape per hotel (INSERT; deduped per UTC day on re-runs, 2026-07-09)
- `posts` — upserted on `(post_id, instagram_handle)`. Collab/co-posts are KEPT (no owner filter): a co-post appears on each partner's grid and is stored once per grid so each hotel measures it against its own baseline. Composite key applied via setup-composite-post-key.sql. `coauthor_usernames text[]` holds Instagram's native co-author handles (setup-coauthors.sql, 2026-07-12) — the dashboard's primary collab signal.
- `standout_posts` — written separately (see `add-theme-tag.sql`, `backfill-themes.js`)

# Instagram Pipeline — Session Context

## What this repo is
A Node.js (ESM) script that scrapes Instagram data for luxury hotels using Apify, then writes results to Supabase. It runs on a **two-tier schedule via GitHub Actions** — a cheap **weekly** incremental (Mondays 05:00 UTC, last 10 days) plus a **monthly** deep-sweep (1st of the month 05:00 UTC, last 35 days) — and a manual-only **full** baseline rebuild. All three are thin callers of one reusable workflow (`.github/workflows/scrape-pipeline.yml`); each run costs real Apify money (see `APIFY-COST.md`). Every run also calls `generate-insight.js` after the scrape to produce "why it worked" analysis for the current top 10 non-collab breakouts (needs the `ANTHROPIC_API_KEY` secret; the workflow installs ffmpeg for video-frame analysis). A daily `freshness-check.yml` workflow alarms when the newest post is older than 8 days (`check-freshness.js` fails the run so GitHub emails the owner; also emails ALERT_EMAIL via Resend once `RESEND_API_KEY` is set). The dashboard at `../hotel-dashboard/` reads the data this pipeline writes. (The `hotels` table holds 465 hotels; only the ~205 with `tracked = true` are scraped.)

## How to run

One runner (`scrape-run.js`) with three modes, selected by env (see the top of that file). All scrape only hotels with `tracked = true` (beta: the 200 most-followed — set by `setup-tracked.sql`), in batches of 50.

| Command | Mode | What it pulls | When |
|---|---|---|---|
| `npm run weekly` | windowed | posts from the **last 10 days** (`SCRAPE_WINDOW_DAYS=10`) | weekly cron |
| `npm run monthly` | windowed | posts from the **last 35 days** (`SCRAPE_WINDOW_DAYS=35`) — re-refreshes a month's engagement so late-viral posts surface | monthly cron |
| `npm run full` | count | each hotel's **last 30 posts**, no date window (`SCRAPE_FULL=1`) — baseline rebuild | manual only, rare |
| `npm run test5` | — | 5 hardcoded handles, for smoke-testing | ad hoc |

Windowing is cost control: the breakout baseline is computed by the dashboard from posts **already stored** in Supabase (posts upsert), so history accumulates and each run only needs the new deltas — no need to re-fetch 30 posts/hotel every week (that repeatedly blew the Apify cap; see `APIFY-COST.md`). Env overrides: `SCRAPE_WINDOW_DAYS`, `SCRAPE_POST_CEILING` (per-hotel safety cap in windowed modes, default 50), `SCRAPE_POST_LIMIT` (posts/hotel in full mode, default 30). To widen coverage, flip more hotels to tracked and re-run.

**Re-runs are safe:** posts upsert on the composite key and profile snapshots dedupe per UTC day (added 2026-07-09), so retrying a failed batch the same day cannot create duplicates. `scrape-run.js` prints skipped handles at the end — re-run those by editing the list in `test-run.js`. (The old `remaining-handles.js` with its stale hardcoded list was removed 2026-07-09.)

### When a scrape fails (rules in `scrape-outcome.js`, tested)
The exit code is decided by `classifyScrape`, kept as a pure function precisely
so each rule has a proven path to firing:

| Outcome | Exit | Meaning |
|---|---|---|
| `all-failed` | **1** | Every batch threw — the 1 Aug unpaid-invoice case |
| `no-posts` | **1** | Nothing was collected, so nothing in Supabase changed |
| `mass-failure` | **1** | ≥`ESCALATION_RATIO` (50%) of batches failed — ~100 hotels missing is past what an overlapping window absorbs |
| `partial` | 0 | A minority of batches failed; loud warning, next run's overlap heals it |
| `ok` | 0 | — |

The `SCRAPE COMPLETE` / `SCRAPE FAILED` banner is printed **from that same
classification**, so it can never read COMPLETE over a run that then exits 1.

⚠ **`assertSucceeded` (added 2026-08-05, review finding 2):** `scrape.js` now
throws when an Apify actor run ends anything other than `SUCCEEDED`. A
FAILED/ABORTED/**TIMED-OUT** run can leave a *partial* dataset, which upserts as
cleanly as a whole one — that is how a batch dying after 30 of its 50 hotels
passed for a complete week. The trade is deliberate: the partial results we paid
for are discarded, and the next windowed run refetches them.

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
| `scrape-run.js` | Runs the scrape across all tracked handles in batches of 50. One runner, three modes (weekly/monthly/full) selected by env — see "How to run" |
| `test-run.js` | Runs scrape for 5 handles only (smoke test) |
| `check-images.js` / `audit-post-counts.js` | Read-only diagnostics (image coverage / posts per hotel) |
| `cleanup-images.js` | Prunes `standout-images` of covers no view can reach. Chained onto every scrape via `npm run weekly`/`monthly`/`full`. Dry-run unless `--apply`. See "Image storage" |
| `compress-images.js` | One-off backfill: re-encodes pre-2026-07-30 covers to WebP in place. Already applied to prod. Dry-run unless `--apply` |
| `backfill-themes.js` | Ad-hoc AI theme-tag backfill for standout_posts |
| `likes-check.js` | Pure, tested rules for "is this stored like count still true?" — `parseOgCounts`, `classifyLikeCheck`, `classifyLikeRun`, and the tolerances. Split out so each branch gets a test, same as `scrape-outcome.js` |
| `verify-likes.js` | Checks the top breakouts against the LIVE Instagram posts. Last step of `scrape-pipeline.yml`. See "Verifying like counts" below |
| `setup-tables.sql` | SQL to create Supabase tables (already run — do not re-run) |
| `setup-standout-posts.sql` | SQL for standout_posts table (already run) |
| `setup-tracked.sql` | Adds/refreshes hotels.tracked = top-200 by followers (idempotent; run 2026-07-01) |
| `setup-coauthors.sql` | Adds `posts.coauthor_usernames text[]` for native collab detection (run in Supabase SQL editor BEFORE deploying the dashboard select — 2026-07-12) |
| `setup-post-media.sql` | Adds `posts.child_image_urls text[]` + `posts.video_url text` for full carousel/video analysis (run in Supabase SQL editor BEFORE the next scrape + generate-insight) |
| `generate-insight.js` | Per-post editorial analysis (what it is / why it worked / try this) + driver/theme tags → standout_posts. **Claude Sonnet 5** Vision + adaptive thinking + structured output. Runs automatically after every scrape (in the reusable `scrape-pipeline.yml`, needs `ANTHROPIC_API_KEY`; the workflow installs ffmpeg). Targets the current **top 10 non-collab breakouts**, selected with the SAME rule as the dashboard — the breakout constants are DUPLICATED from `../hotel-dashboard/lib/data.ts` (last-30 median, 2× threshold, MIN_ENGAGEMENT 100, MIN_BASELINE_ENGAGEMENT 25, tracked-only, 7-day window) — keep the two in sync. Sees the WHOLE carousel (every slide via `posts.child_image_urls`) and the WHOLE video (frames sampled across it via **ffmpeg** from `posts.video_url`); falls back to the cover image if media/ffmpeg is unavailable. `post_insight` holds the composed 3-line note the dashboard's "Editor's note" card renders. Local runs need `brew install ffmpeg`. Weekly prose generation REMOVED 2026-07-01. |

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

### Keeping the bucket small (added 2026-07-30, plan updated 2026-08-04)
The bucket hit **3.2 GB against Supabase's then 1 GB free-tier limit** and the org went
into overage. Two causes, both now fixed — it is back to ~360 MB.

> The project moved to **Pro (100 GB included) on 4 Aug 2026**, so the hard cap is no
> longer anywhere near. Everything below still applies: it is what keeps the bucket at a
> steady ~360 MB instead of growing ~800 MB/month into a bill. `check-storage.js` now
> guards a deliberate 5 GB **cost** line rather than the old outage cliff.

- **Covers are resized on upload.** `uploadImage` in scrape.js re-encodes to
  **WebP q80, max 1000px wide** (~85 kB) instead of storing Instagram's
  full-resolution file byte-for-byte (~329 kB). The dashboard never renders an
  image wider than a ~400px box, so there is no visible loss. New objects are
  named `.webp` and the superseded `.jpg`/`.png` is removed on re-scrape.
- **`cleanup-images.js` prunes what no view can reach.** scrape.js stores a cover
  for EVERY post, but only breakouts and the last ~30 days ever render — that was
  ~90% of the bucket sitting unreachable. It now runs automatically after every
  scrape (`npm run weekly` / `monthly` / `full` chain it), so the bucket holds a
  steady state instead of growing ~800 MB/month.
  Keeps: posts on tracked, non-hidden hotels that are ≤35 days old **or** ≥1.5×
  their hotel's median, plus anything with `editors_pick`/`landing_pin` or saved
  by a member. The 1.5× (vs the dashboard's 2×) is deliberate headroom — a post
  below 2× today can cross the line later if its hotel's median drifts down.
- **`compress-images.js`** is the one-off backfill for objects written before this
  date. It overwrites **in place at the same path**, so `posts.image_url` and
  `standout_posts.stored_image_url` need no rewrite and no URL ever breaks — an
  object can therefore be WebP bytes at a `.jpg` name, which is cosmetic only
  (browsers dispatch on Content-Type). It skips anything already `image/webp`, so
  re-runs are cheap. Already applied to prod; you shouldn't need it again.

⚠ **Deleting a cover changes no figure on the dashboard.** Engagement lives in the
`posts` columns; baselines, medians, ER, breakout selection and the What's Working
buckets never read an image. A post whose cover is gone falls back to the branded
`MEDIA_PLACEHOLDER` gradient — the same path the ~5% of rows on expired CDN URLs
already take.

Both scripts are **dry-run by default**; pass `--apply` to write.
`npm run cleanup:dry` / `npm run compress:dry` to preview.

### Records that aren't posts (fixed 2026-08-05)
`post_id` was derived as `p.id || p.shortCode || p.url`. When a profile had
nothing inside the scrape window the actor could return a **profile-level**
record with no id, no shortCode and no timestamp — so the `p.url` fallback wrote
a row whose `post_id` was `https://www.instagram.com/<handle>` and whose every
metric was null. Twelve reached production between 21 Jul and 4 Aug 2026.

A real post always carries a timestamp, so that is now the test: no timestamp →
not a post → skipped and **counted in the per-handle log line**, so an actor that
starts returning nothing but profile records is visible rather than silent. The
twelve existing rows were deleted on 5 Aug (they held no data beyond the handle
and a capture time, and nothing in `standout_posts` or `saved_posts` referenced
them).

## Hidden like counts
Instagram hides likes on some posts/accounts, and the Apify actor's sentinel for it has DRIFTED over time: `null`/missing (the documented case), `-1` (its behaviour as of late Jul 2026), and — through Jun/Jul 2026 — a literal **`3`** (the 3-avatar "liked by A, B and others" preview count leaking through as data; 813 rows reached the DB looking like genuine 3-like posts before the 2026-07-31 audit caught it). Since then `likes.js → normalizeLikesCount` maps every sentinel to `null` at scrape time — `null` is the ONE stored convention — and the historical `3` rows were backfilled to `null` (`backfill-likes-sentinel.sql`).
**As of 5 Aug 2026 the convention is actually true in the data**: the last 96 `-1`
rows (49 hotels, 10 Jun – 26 Jul) were normalised to `null`, and a live count of
both `likes_count = -1` and `likes_count = 3` now returns zero. `comments_count`
never carried a sentinel. No dashboard figure moved — `hasVisibleLikes` already
excluded both values — but "null is the one stored convention" is no longer a
statement with exceptions. The dashboard's `hasVisibleLikes` excludes hidden-like rows from every engagement calculation. If engagement figures ever look collapsed again (a hotel whose "typical post" is single-digit likes), suspect a NEW sentinel value first: check the raw dataset of the latest run before trusting the numbers.

## Verifying like counts (added 2026-08-08)

**The actor sometimes returns a like count that is simply wrong, and only for
Reels.** The 7 Aug viability audit checked the top 20 all-time breakouts against
the live posts: four stored MORE likes than Instagram shows — Jumeirah Al Naseem
at 36,202 against a real 315. A 28-post sample localised it — Image 0/2, Sidecar
0/12, **Video 6/14**, overstated by 5.2× to 13.0×.

Three things were ruled out by reading the stored Apify datasets, so don't redo
them: it is **not** our mapping (`scrape.js` stores `p.likesCount` verbatim and
the dataset holds the same wrong number), it is **not** a play/view count leaking
through (`videoViewCount` and `videoPlayCount` are present and distinct in the
same row), and it is **not** fixed by re-scraping — the actor is *unstable*, one
Rosewood co-post returning 333 likes on 21 Jul, 2,665 on 27 Jul, and 513 live.

So the guard is a **check, not a correction**: read the number the customer would
see if they clicked through, and refuse to show ours if it is bigger. That is
exactly what a hotel does to its own post, in about ten seconds.

```bash
node verify-likes.js                      # published feed; exit 1 if too many are wrong
node verify-likes.js --include-pending    # also what Publish is about to release
node verify-likes.js --window=7 --limit=40
node verify-likes.js --json               # machine-readable
node verify-likes.js --apply              # ALSO hides the offenders (writes)
```

- **Runs last in `scrape-pipeline.yml`, with `--include-pending`.** Last because it
  can legitimately go red on good data, and the housekeeping above it (especially
  `cleanup-images.js`) must still run when it does. `--include-pending` because
  fresh posts sit behind `dashboard_settings.publish_cutoff` until Neil hits
  Publish — without it the step checks *last* week's feed and passes.
- **Only overstatement counts.** Stored *below* live is the normal direction (the
  post kept earning likes after the scrape) and is never flagged.
- **Tolerances** live in `likes-check.js`: 25% overstatement before a post is
  called indefensible, and the run fails above 15% of checked posts. Instagram
  rounds above ~10,000 ("51K"), so a rounded live figure is compared against the
  top of its bracket.
- **`--apply` hides rather than corrects**, via `standout_posts.hidden`. We do not
  know the true figure, so writing one would be inventing data. Hiding excludes
  the post from every figure, is keyed on `post_id` so a co-post goes from every
  partner's grid at once, and Neil can undo it from the /admin hidden chips.
  ⚠ Not wired into the workflow — the pipeline reports, a human decides.
- **Costs nothing.** No Apify credit, no AI. Reads `og:description`, which
  Instagram serves to crawler user agents (a normal browser UA gets a login wall).
- ⚠ The breakout constants are DUPLICATED from `../hotel-dashboard/lib/data.ts`,
  same as `generate-insight.js`. If a threshold moves there, move it here, or this
  verifies a different set of posts than the feed shows — which is the one way it
  could quietly stop protecting anything.

Proven both ways on 8 Aug 2026: red on the all-time top 20 (4 of 20 overstated,
exit 1, all four the known-bad Reels, no false positives among 16 good posts
including honest drifts like stored 100,527 against live ~129,000), and green on
the 7-day feed (18 of 18 clean, exit 0).

## Supabase tables written
- `profile_snapshots` — one new row per scrape per hotel (INSERT; deduped per UTC day on re-runs, 2026-07-09)
- `posts` — upserted on `(post_id, instagram_handle)`. Collab/co-posts are KEPT (no owner filter): a co-post appears on each partner's grid and is stored once per grid so each hotel measures it against its own baseline. Composite key applied via setup-composite-post-key.sql. `coauthor_usernames text[]` holds Instagram's native co-author handles (setup-coauthors.sql, 2026-07-12) — the dashboard's primary collab signal.
- `standout_posts` — written separately (see `add-theme-tag.sql`, `backfill-themes.js`)

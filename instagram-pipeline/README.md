# High Elm — Instagram Pipeline

Collects public Instagram data for 465 Forbes Five-Star hotels and stores it in Supabase.

## What it does

1. Runs two Apify actors in parallel for a batch of hotel handles:
   - `instagram-profile-scraper` → follower counts, bio, verified status → `profile_snapshots` table
   - `instagram-post-scraper` → likes, comments, captions, dates → `posts` table
2. Writes results to Supabase. Posts deduplicate on `post_id`; profiles always insert a new dated row.

## Setup

1. Copy credentials into `.env` (already done — don't commit this file):
   ```
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   APIFY_TOKEN=
   APIFY_ACTOR_ID=apify/instagram-post-scraper
   ```
2. Install dependencies: `npm install`

## How to re-run a scrape

**Test run (5 hotels):**
```bash
npm run test5
```

**Full run (all 465 hotels):**
```bash
npm run full
```
This runs in batches of 50. Takes ~90 minutes and costs ~$5 on Apify.
Posts window is 14 days on first setup, 7 days for weekly top-ups.

**Re-run the hotels that were skipped (e.g. after topping up Apify credits):**
```bash
node remaining-handles.js
```

**Weekly top-up (7-day window, all hotels):**
Edit `full-run.js` and change `POST_WINDOW` from `'14 days'` to `'7 days'`, then run `npm run full`.

## Files

| File | Purpose |
|---|---|
| `scrape.js` | Core pipeline — calls Apify, normalises data, writes to Supabase |
| `test-run.js` | Checkpoint 1 — 5-hotel test |
| `full-run.js` | Checkpoint 2 — all 465 hotels in batches |
| `remaining-handles.js` | Re-run handles skipped due to Apify limit |
| `setup-tables.sql` | SQL to create the two Supabase tables (already run) |

## Supabase tables

- **`hotels`** — 465 Forbes Five-Star hotels with Instagram handles (pre-populated)
- **`profile_snapshots`** — dated follower/bio snapshots, one new row per scrape
- **`posts`** — one row per post, upserted on `post_id`

Credentials reference: `../keys/README.md`

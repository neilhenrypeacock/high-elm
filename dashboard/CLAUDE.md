# Content Radar Dashboard — Session Context

## What this repo is
A Next.js 16 app (App Router, Turbopack) that renders the High Elm Studio "Content Radar" — a weekly Instagram performance dashboard tracking ~465 luxury hotels. Deployed to GitHub Pages via `website/` in the parent repo; this repo is the source.

## Companion repo
The data pipeline is a **separate manual repo** at `../instagram-pipeline/`. It is NOT part of this Next.js project. You run it locally to scrape and upload data; the dashboard only reads from Supabase.

## File structure
```
app/
  page.tsx              — server component; calls getPortfolioData(), passes to FilteredDashboard
  layout.tsx            — root layout, fonts, global CSS vars
  globals.css           — design tokens (--ink, --sage, --card, --line, etc.)
components/
  FilteredDashboard.tsx — main shell: header, stats bar, section layout (NO filter switching yet)
  ContentRadar.tsx      — breakout posts: top-5 large cards / next-10 compact rows / see-more tier
  WhatsWorking.tsx      — bar charts: format, caption length, day, time-of-day ER
  HotelTable.tsx        — sortable hotel leaderboard with ER flag warnings
  TopHotels.tsx         — top-5 leaderboard panel (7-day ER, follower-gated)
  StandoutPosts.tsx     — UNUSED legacy grid component (do not delete; kept for reference)
  TrendPanel.tsx        — UNUSED stub for future trend charts (do not delete)
lib/
  data.ts               — ALL data fetching and computation (single function: getPortfolioData)
  supabase.ts           — Supabase client initialisation
```

## Key constants (lib/data.ts)
| Constant | Value | Purpose |
|---|---|---|
| `MAX_STANDOUT_POSTS` | 25 | Max breakout posts returned to ContentRadar |
| `OUTLIER_THRESHOLD` | 2 | Posts must hit 2× hotel median to qualify as breakout |
| `OUTLIER_WINDOW_DAYS` | 7 | Only posts from the last 7 days are candidates |
| `HOTEL_ER_POSTS` | 12 | Last N posts used for overall ER in leaderboard |
| `MIN_ENGAGEMENT` | 100 | Absolute floor; posts below this are noise |
| `BREAKOUT_AMBER_THRESHOLD` | 5 | (ContentRadar) Posts ≥5× turn amber; below = sage |
| `BASELINE_POSTS` | 25 | Used only in low-confidence baseline ER flag warning |
| `BASELINE_MAX_AGE_DAYS` | 183 | Used only in low-confidence baseline ER flag warning |
| `BASELINE_MIN_POSTS` | 12 | Used only in low-confidence baseline ER flag warning |

## Breakout baseline method (post-revert, current)
The baseline is the **median absolute engagement (likes + comments) across ALL valid posts** for a hotel — all-historical, no recency window. The three `BASELINE_*` constants above are NOT used for the baseline computation itself; they are only used in the `er_flag_reason` logic that warns when a hotel has too few recent posts for a reliable ER.

## ContentRadar tiers (MAX_STANDOUT_POSTS = 25)
- **Top 5:** large editorial cards (LargeCard)
- **Posts 6–15:** always-visible compact rows (SmallCard)
- **Posts 16–25:** hidden behind "see more" button (SmallCard)

## Supabase tables
- `hotels` — hotel list with handles, names, regions, countries
- `profile_snapshots` — follower counts over time (one row per scrape)
- `posts` — all scraped posts (upserted on post_id)
- `insights` — AI-generated weekly prose + takeaways
- `standout_posts` — per-post stored image URLs, insights, driver/theme tags

## Image storage
Post images are saved to the **`standout-images`** Supabase Storage bucket by the pipeline. The dashboard reads `stored_image_url` from `standout_posts` and falls back to the live Instagram CDN URL.

## Build
```bash
npm run build   # type-check + production build (must pass before shipping)
npm run dev     # local dev server
```

## Current state / known gaps
- Filter switching (top50/top30/top10) is wired in data.ts but the UI hardcodes `filters.all` — filter tabs are not yet active.
- Dashboard is data-starved until the next Apify top-up run provides more post history.
- TikTok and YouTube platform toggles are UI-only placeholders.

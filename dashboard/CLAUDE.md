# Content Radar Dashboard — Session Context

## What this repo is
A Next.js 16 app (App Router, Turbopack) that renders the High Elm Studio "Content Radar" — a weekly Instagram performance dashboard tracking ~465 luxury hotels. Implements the **Content Radar identity system** (design handoff bundle: identity README + DASHBOARD.md spec). The page uses ISR (`revalidate = 3600`), NOT force-dynamic — data updates weekly via the pipeline.

## Companion repo
The data pipeline is a **separate manual repo** at `../instagram-pipeline/`. It is NOT part of this Next.js project. You run it locally to scrape and upload data; the dashboard only reads from Supabase.

## Design system (do not deviate)
- **Fonts:** Baloo 2 (700/800, `--font-display`) for display numerals + wordmark ONLY; Hanken Grotesk (`--font-body`) for everything readable; Space Mono (`--font-label`) for all-caps micro-labels (eyebrows, captions, column headers). Space Mono is the canonical mono product-wide (Neil's decision, resolving the spec's JetBrains-vs-Space conflict).
- **Teal discipline:** `--signal #5B9BAA` = the signal (hero numeral, stat figures, top bar fill, mark centre); `--signal-deep #3D7A8A` for interactive/deltas on light; `--signal-light #8BBDC9` on dark. One or two teal notes per view.
- **Tokens** live in `app/globals.css` (`--page #E7E3D9`, `--surface`, `--ink-deep #1D1B17`, `--panel-dark #232019`, hairlines, bar ramp, shadows). Page bg has radial teal/sage glows with a 30s `crdrift` animation, gated on `prefers-reduced-motion`.
- Card radius 14; content capped at 1200px with 40px gutters (20px ≤480px).

## File structure
```
app/
  page.tsx              — server component; revalidate=3600; calls getPortfolioData()
  layout.tsx            — fonts (Baloo 2 / Hanken Grotesk / Space Mono), brand favicon
  error.tsx / loading.tsx — branded error + loading states
  globals.css           — all design tokens, hover/focus utilities, responsive breakpoints
components/
  Dashboard.tsx         — shell: top bar + channel switcher, dark hero w/ by-the-numbers
                          panel, section rules, floating bottom nav (mailto feature pill),
                          dark footer. PillToggle exported from here.
  ContentRadar.tsx      — timeframe toggle handled by shell; top-5 spec cards, ranks 6–25
                          table card, Show-more/less expander
  WhatsWorking.tsx      — 3 dark stat cards + format/caption bar cards; day/time/frequency
                          panels behind "Show more detail" expander (kept by Neil's decision)
  HotelTable.tsx        — functional leaderboard in the spec's 7-col grid: dark header,
                          sortable buttons w/ aria-sort, rank col, ER mini-bars, top-3 tint,
                          top-10 + view more, live search + region filter
  Lockup.tsx / MarkSvg.tsx — brand lockup (0.724/0.207/0.172 ratios, Space Mono endorsement)
  StandoutPosts.tsx     — UNUSED legacy grid component (do not delete; kept for reference)
  TrendPanel.tsx        — UNUSED stub for future trend charts (do not delete)
lib/
  data.ts               — ALL data fetching and computation (single function: getPortfolioData)
  supabase.ts           — Supabase client (service role, persistSession:false)
  format.ts             — shared fmtFollowers/fmtPostedAt/fmtDate/fmtNumber
```
Removed in the redesign: `FilteredDashboard.tsx`, `TopHotels.tsx`, the top50/30/10 filter sets, the `insights` table query, `eligible_this_week`.

## Key constants (lib/data.ts)
| Constant | Value | Purpose |
|---|---|---|
| `MAX_STANDOUT_POSTS` | 25 | Max breakout posts returned to ContentRadar |
| `OUTLIER_THRESHOLD` | 2 | Posts must hit 2× hotel median to qualify as breakout |
| `OUTLIER_WINDOW_DAYS` | 7 | Only posts from the last 7 days are candidates |
| `HOTEL_ER_POSTS` | 12 | Last N posts used for overall ER in leaderboard |
| `MIN_ENGAGEMENT` | 100 | Absolute floor; posts below this are noise |
| `BASELINE_*` | 25/183/12 | Used ONLY in the low-confidence er_flag_reason warning |

## Breakout baseline method (current)
The baseline is the **median absolute engagement (likes + comments) across ALL valid posts** for a hotel — all-historical, no recency window. The `BASELINE_*` constants are NOT used for the baseline itself, only for the `er_flag_reason` warning.

## Data notes
- `week_ending` is derived from **max(posted_at)** in the data, never the render date.
- `profile_snapshots` and `posts` are both fully paginated (1,000/page); posts deduped by post_id.
- Only the "all hotels" stat set is computed — the spec's timeframe/channel toggles are disabled "soon" placeholders.
- ContentRadar tiers: top 5 = large cards, 6–15 always visible rows, 16–25 behind "Show more".

## Supabase tables
- `hotels` — hotel list with handles, names, regions, countries
- `profile_snapshots` — follower counts over time (one row per scrape)
- `posts` — all scraped posts (upserted on post_id)
- `standout_posts` — per-post stored image URLs, insights, driver/theme tags
- `insights` — AI weekly prose (currently NOT read by the dashboard)

## Image storage
Post images are saved to the **`standout-images`** Supabase Storage bucket by the pipeline. The dashboard reads `stored_image_url` from `standout_posts` and falls back to the live Instagram CDN URL (signed, expires — fallback gradient shows for older posts).

## Build
```bash
npm run build   # type-check + production build (must pass before shipping)
npm run dev     # local dev server (preview name: hotel-dashboard, port 3200)
```

## Current state / known gaps
- TikTok/YouTube channels and Last month/All time timeframes are disabled "soon" pills per the design.
- Floating nav has no scroll-spy (plain hash anchors, per prototype).
- Anon key ready but needs Neil's one-time manual step: run `supabase/rls.sql` in the Supabase SQL editor, add `SUPABASE_ANON_KEY` to `.env.local` + Vercel. Until then lib/supabase.ts falls back to the service-role key with a warning.
- ESLint (`npm run lint`, flat config) and vitest (`npm test`, tests/data.test.ts) are set up — both must pass before shipping, alongside `npm run build`.
- ER flags are two-tier: hard flags (too few posts / implausible ER) null the ER out of all stats; soft flags (thin breakout baseline) only show a ⚠ next to a still-counted ER.
- Dashboard is data-starved until the next Apify top-up run provides more post history (some hotels have tiny engagement medians, which inflates multipliers).

# Implementation Log — Content Radar Dashboard
**Session date:** 30 June 2026  
**Written for:** Claude (future session context)

---

## What was built / changed this session

This was a UI polish + data logic session on the Content Radar dashboard (Next.js / Vercel / Supabase). A separate agent also attempted a data-layer change (Job 1 baseline) which caused a production issue and was reverted. That is documented below.

---

## Changes successfully shipped

### UI / copy changes (all live)

1. **Breakout posts layout restructured (ContentRadar.tsx)**
   - Top 5 posts → large editorial cards (unchanged format)
   - Posts 6–15 → always-visible compact small cards (new tier)
   - Posts 16–25 → hidden behind a "See more (N posts)" button
   - `MAX_STANDOUT_POSTS` raised from 15 → 25 to support this layout

2. **What's working section (WhatsWorking.tsx)**
   - Added auto-generated prose summary at the top (derived from live data: median ER, top format, best day, top caption length, posting frequency gap)
   - Format + caption panels always visible
   - "Does posting more help?" and timing panels moved behind a "Show more detail ↓" toggle button

3. **Time window filter labels (FilteredDashboard.tsx)**
   - "7 days" → "Last 7 days"
   - "14 days soon" → "Last 14 days coming soon"
   - "30 days soon" → "Last 30 days coming soon"

4. **Platform toggle labels (FilteredDashboard.tsx)**
   - "TikTok" + separate "soon" badge → "TikTok coming soon" (label inline)
   - "YouTube" + separate "soon" badge → "YouTube coming soon" (label inline)

5. **Top hotels card (TopHotels.tsx)**
   - Hotel names no longer truncated — card expands to full name
   - Header changed from "Top hotels · 7-day engagement rate" → "Top hotels this week"
   - Footer copy updated to: "These hotels have had the highest average engagement rate across their posts in the last 7 days. Ranked from highest to lowest — hotels with 1,000+ followers only."

6. **Hotel leaderboard (HotelTable.tsx)**
   - "Region" column → "Country"
   - "All regions" dropdown → "All countries"

7. **Section headings (FilteredDashboard.tsx)**
   - H2 font size: 16px/500 → 24px/600 (bolder, more prominent)

8. **Stats bar copy (FilteredDashboard.tsx)**
   - "hotels" label → "5 star hotels"

9. **Intro copy (FilteredDashboard.tsx)**
   - Rewritten to: "The Content Radar — powered by High Elm Studio — tracks Instagram performance across the world's most prestigious and followed luxury hotels. Every week you get a snapshot of content that significantly outperforms the average, giving marketing teams a continuously updated library of what's genuinely working in hotel content."

10. **"This week" lead text (FilteredDashboard.tsx)**
    - "N posts broke past their hotel's own normal" → "N posts significantly outperformed their hotel's own average"
    - 4 bullets now always rendered: peak post uplift, best day (full name e.g. "Thursdays"), format breakdown with %, time of day block
    - Day name bug fixed: abbreviated DB values (Thu) were rendering as "Thus" — mapped to full names (Thursday)

11. **Pipeline investigation (read-only, no changes)**
    - Pipeline lives at `/Users/neilpeacock/Projects/high-elm/instagram-pipeline/` — separate Node.js folder, not inside the dashboard repo
    - Run manually via `npm run full` — NOT scheduled/automated
    - Images saved to Supabase Storage bucket `standout-images` at scrape time
    - Full table column lists documented in DASHBOARD_CONTEXT.md

---

## The problem that caused a production incident

### Job 1 — Baseline change (attempted, reverted)

**What was attempted:**  
A separate agent changed the breakout multiplier baseline from "median of ALL historical posts" to "median of most recent 25 posts within 183 days."

**Why it broke production:**  
The new baseline used only recent posts. For many hotels, recent posts have higher engagement than their historical average (accounts grow over time). This pushed the baseline UP, making it much harder for any given post to exceed 2×. Result: the dashboard went from ~3 breakout posts down to 1.

**The simple explanation:**  
Old way = "compared to your whole career." New way = "compared to your recent best form." The recent bar was too high.

**What was done to fix it:**  
Reverted `lib/data.ts` back to all-historical baseline. The three new constants (`BASELINE_POSTS`, `BASELINE_MAX_AGE_DAYS`, `BASELINE_MIN_POSTS`) and the extended `er_flag_reason` logic were removed. `MAX_STANDOUT_POSTS` was kept at 25 (was 15 — this was a genuine fix needed for the layout).

**Current state of baseline:**  
Back to original: median of ALL valid (non-hidden-likes) posts for a hotel, no recency cap.

**Note for future:**  
The recent-baseline idea is sound in principle — it would make the multiplier more meaningful as the "vs recent form" comparison. But it needs to be calibrated carefully against the actual dataset before shipping. Recommend testing it with a known set of posts and comparing before/after breakout counts before deploying again.

---

## The second problem — only 1 post showing even after revert

After reverting the baseline, the dashboard still only showed 1 breakout post. Investigation revealed this was NOT a code issue.

**Root cause:** The Apify monthly usage limit was hit. The pipeline hadn't been run recently. The 7-day window (`OUTLIER_WINDOW_DAYS = 7`) means only posts scraped within the last 7 days qualify as breakouts. With no recent scrape, almost no posts existed in that window.

**Evidence:**
- `week_ending` = 30 Jun 2026 → window looks back to 23 Jun
- `posts_count` = 1,322 (plenty of historical data) but nearly none within 7 days
- Running `npm run full` in the pipeline confirmed: "Monthly usage hard limit exceeded" across all 10 batches — 0 profiles loaded, 0 posts collected

**Current status:**  
The dashboard is live and correct but data-starved. It will show full breakout content again as soon as the pipeline is run after the Apify limit resets (or the plan is upgraded/topped up).

---

## Current production state

| Thing | Status |
|---|---|
| Dashboard URL | https://dashboard-one-xi-75.vercel.app |
| Dashboard code | ✅ Correct — all UI changes live |
| Breakout baseline | ✅ Reverted to all-historical (working correctly) |
| MAX_STANDOUT_POSTS | ✅ 25 (was 15) |
| Apify account | ❌ Monthly limit exceeded — pipeline cannot run |
| Posts in 7-day window | ~1–2 (stale data) |
| Breakout posts showing | 1 (will fill to 5+ large cards once pipeline runs) |
| Notion STATE note | ✅ Updated by agent (all 3 sections) |

---

## Files changed this session

| File | What changed |
|---|---|
| `components/ContentRadar.tsx` | Layout restructure: top 5 / next 10 / see more |
| `components/FilteredDashboard.tsx` | Copy, labels, H2 size, bullet logic, day name fix |
| `components/WhatsWorking.tsx` | Prose summary, expand/collapse detail panels |
| `components/TopHotels.tsx` | No truncation, updated copy |
| `components/HotelTable.tsx` | Region → Country |
| `lib/data.ts` | MAX_STANDOUT_POSTS 15→25; baseline change attempted and reverted |
| `DASHBOARD_CONTEXT.md` | Created — full codebase reference for future Claude sessions |
| `IMPLEMENTATION_LOG.md` | This file |

---

## Immediate next actions (for Neil / next session)

1. **Top up or wait for Apify limit reset** — then run `npm run full` from `/Users/neilpeacock/Projects/high-elm/instagram-pipeline/`
2. **After pipeline runs** — verify the dashboard fills up with breakout posts as expected
3. **Schedule the pipeline** — currently run manually; should be automated weekly (GitHub Actions cron or similar)
4. **Revisit the baseline change** — the recent-25-posts baseline is a better product decision but needs careful calibration before re-shipping

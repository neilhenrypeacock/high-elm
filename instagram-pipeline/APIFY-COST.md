# Apify — cost model & spending strategy

_Last reviewed: 2026-07-21 against the live console (https://console.apify.com/billing).
The console is always the truth; this doc is the model + the agreed cadence._

## Live account snapshot (July 2026)

| Fact | Value |
|---|---|
| Plan | **Starter — $29/month** (Apify Store discount: Bronze) |
| Prepaid platform usage included | **$29** |
| Monthly usage cap ("limit") | **$40** — actors hard-stop when hit |
| July platform usage | **$31.71** = $29 prepaid consumed + **$2.71 overage** |
| — of which Actors | **$31.44** (storage $0.25, data transfer $0.02, proxy $0) |
| CU rate (for CU-billed actors) | $0.20 / CU |
| Next invoice (Aug 1) | ~$35.14 inc 20% UK VAT |

**What the $40 cap means:** this is the "monthly limit exceeded" that blocked the pipeline on
2 Jul 2026. Early-July runs hit the cap and actors stopped. July's ~$31 reflects roughly **two
full runs** before the block — which pins a full 30-post run at **~$14–16**.

## What actually consumes usage

We call two first-party actors, both **pay-per-result** (no compute surcharge on top):

| Actor | Rate (Starter) | Full run |
|---|---|---|
| `apify/instagram-post-scraper` | ~$2.30 / 1,000 results | ~205 hotels × 30 posts = 6,150 → ~$14 |
| `apify/instagram-profile-scraper` | ~$2.30 / 1,000 results | ~205 profiles → ~$0.47 |

Post volume is the entire bill; profiles are rounding error. Storage, data transfer, GitHub
Actions minutes, and the Anthropic insight step are all negligible or billed elsewhere.

**The problem with the old cadence:** `full-run.js` pulled each hotel's last 30 posts *every
week*, count-based. A luxury hotel posts a handful of times a week, so ~75% of every run
re-scraped posts already in Supabase. 4 weekly runs ≈ **$56–64/month** — always over both the
$29 prepaid and the $40 cap. That's the root cause of the block, not the plan.

## Cadence (implemented 2026-07-21)

Goal: keep the baseline fresh, catch posts that go viral **weeks after** posting, and stay inside
the $29 prepaid. Windowed modes use `onlyPostsNewerThan` (supported in `scrape.js` via the
`postsNewerThan` arg) instead of `resultsLimit`. One runner (`scrape-run.js`), three modes selected
by env; each is a thin GitHub Actions caller of the reusable `scrape-pipeline.yml`.

| Type | Command | Workflow | Window | Purpose | ~Results | ~Cost |
|---|---|---|---|---|---|---|
| **weekly** | `npm run weekly` | `weekly-scrape.yml` (Mon 05:00 UTC) | last **~10 days** | new posts + fresh engagement | ~1,200 | ~$3 |
| **monthly** | `npm run monthly` | `monthly-scrape.yml` (1st, 05:00 UTC) | last **~35 days** | re-refresh a month → catches late bloomers | ~5,000 | ~$12 |
| **full** | `npm run full` | `full-scrape.yml` (manual only) | 30 posts/hotel, no window | baseline rebuild (e.g. new hotels) | ~6,150 | ~$14–16 |

**Projected scheduled total: ~$21–23/month** (weekly + monthly) → inside the $29 prepaid, no
overage, well under the $40 cap, with headroom to add hotels. The **full** rebuild is manual and
deliberately unscheduled — running it doubles a month's spend, so use it only when genuinely
re-baselining. (Weekly/monthly windows overlap on purpose so a late cron run never leaves a gap; a
`concurrency` group serialises the rare Monday-on-the-1st collision so the two never bill at once.)

**Why the monthly sweep catches late-viral posts:** it re-pulls every post from the last ~month,
refreshing likes/comments on a post that popped weeks after publishing. The dashboard's breakout
list (`lib/data.ts`) has 7-day / 30-day / all-time toggles, so that refreshed post surfaces in the
**30-day and all-time** views. Edge case we accept: a post that goes viral >35 days after posting
falls outside even the monthly window and won't refresh — rare for hotels; widen the monthly reach
if we ever observe it.

## Baseline integrity

The last-30-post breakout baseline is computed by the dashboard from posts **already stored in
`posts`** (upsert), not from each scrape's return. History accumulates, so incremental scraping
never degrades the baseline — the one-time 30-post seed per hotel is already in the DB.

## Plan sizing

Starter ($29) is correct. Scale ($199) only pays off at far higher volume — plan price ≈ prepaid
credit, not a discount. With the cadence above, usage (~$22) sits under the $29 prepaid, so the
effective cost is just the **$29/month flat** (+VAT). If tracked hotels roughly double (~410),
expect ~$40–45/month — revisit the plan then, not before.

## Guardrails

- Keep the **$40 usage cap** as a backstop (raise deliberately if cadence changes).
- Re-runs are idempotent for storage (upsert + per-day snapshot dedupe) but **still re-bill Apify
  per result** — re-run only skipped handles, never the whole set.
- `check-freshness.yml` alarms if data goes stale (the visible symptom of a hit cap).
- `check-images.js` cost estimate corrected to $2.30/1k on 2026-07-21 (was wrongly $0.50/1k).

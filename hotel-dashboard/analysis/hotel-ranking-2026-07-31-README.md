# Hotel ranking — 2026-07-31

**A recommendation, not a decision.** No hotel's `tracked` flag was changed by
this analysis; Neil decides which ~400 to track. Read-only against the DB.

`hotel-ranking-2026-07-31.csv` covers **all 764 hotels** in the `hotels` table.
Computed with the post-backfill engagement rules (the `3` sentinel excluded, the
30-visible-posts-in-12-months baseline window).

## The two hard gates

Disqualified outright — no score:

1. **Not measurable** — fewer than 12 visible-like posts within 12 months.
2. **Dormant** — nothing posted in the last 90 days (a weekly product needs
   active accounts). Applied to tracked hotels only: for untracked hotels a
   quiet 90 days usually means *we stopped scraping them*, not that they
   stopped posting, so they are marked `needs sample scrape` instead of
   being called dormant.

## The split (764 hotels)

| Group | Count | Recommendation |
|---|---|---|
| Ranked, healthy | 192 | `keep` (182 tracked + 10 untracked add-candidates) |
| Ranked, dead-audience pattern | 5 | `dead audience` |
| Tracked, not measurable | 22 | `drop` |
| Tracked, dormant (Armani Hotel Dubai) | 1 | `drop` |
| Untracked, partial data | 221 | `needs sample scrape` |
| No post data at all | 323 | `needs sample scrape` (299 Design Hotels, 14 Forbes, 9 Gold List, 1 W50B) |

## The score (approved by Neil, 2026-07-31)

Each signal is a percentile rank (0–100) among the 197 ranked hotels:

**Score = 50% breakout production + 25% median ER + 15% posting frequency + 10% followers**

- **Breakout production** — breakouts (≥2× own median, ≥500 engagement, the
  product's own rules) per month of *observed* history, so hotels with a short
  scrape history aren't punished for our data window.
- **Median ER** — median per-post (likes+comments)/followers over the baseline
  window. A rate, so it doesn't simply reward being big.
- **Posting frequency** — posts in the last 90 days, per week.
- **Followers** — the weak tiebreak only.

Known biases, stated plainly: the 500-engagement floor under-counts breakouts
for small-following hotels (inherited from the product itself); recently-added
hotels have noisier breakout rates; prestige names that post weakly rank low —
check the `lists` column before dropping a marquee brand.

## Dead-audience flag

Passes both gates but probably shouldn't be tracked: **followers ≥ 20k with a
median ER below 0.05%** — a big audience that never engages (bought or decayed).
Five hotels: Crockfords at Resorts World Genting (#70), Grand Velas Los Cabos
(#71), Jade Mountain (#160), Sky Tower at Solaire (#196), Grand Lisboa Palace
Macau (#197). Crockfords is the known reference case — the rule caught it
without being pointed at it.

## What needs to happen before the 400 can be chosen

544 hotels are `needs sample scrape` — they cannot be ranked on current data.
That is a separately-approved Apify job (cost!), scoped in APIFY-COST.md terms,
NOT run by this analysis.

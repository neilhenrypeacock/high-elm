# Hotel Content Radar

A weekly Instagram performance dashboard for luxury hotels. Two halves of one
system:

| Folder | What it does |
|---|---|
| `hotel-dashboard/` | The Next.js app. Reads from Supabase and computes every metric at request time. |
| `instagram-pipeline/` | Scrapes Instagram via Apify into Supabase. Runs weekly from GitHub Actions. |
| `keys/` | Shared credentials (gitignored). |

| | |
|---|---|
| **Live** | https://www.hotelcontentradar.com |
| **Vercel project** | `dashboard` (root directory `hotel-dashboard`) |
| **Deploys** | on push to `main` |

Read `hotel-dashboard/CLAUDE.md` before changing anything — it holds the design
system, the full constant table, and the reasoning behind the breakout
thresholds. The baseline and threshold are tuned together; don't change one
without the other.

## History: this repo was `high-elm`

Renamed on **5 August 2026**. It used to be a monorepo holding several unrelated
projects. Those are now their own repos:

- **`the-safari-edit-landing-page`** — was `demos/safari-edit`
- **`high-elm-studio`** — was `website/`, which had been a byte-identical copy;
  that repo already existed and now also serves highelmstudio.com

Renaming rather than rebuilding was deliberate: the five Actions secrets and both
scrape workflows live on this repo, so leaving them in place meant the weekly
scrape was never at risk. GitHub redirects the old `high-elm` URLs.

Dormant sub-projects (`audit skill`, `hunter-extract`, `templates`, and four AI
demos) were archived to `~/Projects/_archive/high-elm-dormant/`.

## Scheduled work

| Workflow | When |
|---|---|
| `weekly-scrape.yml` | Mondays 05:00 UTC |
| `monthly-scrape.yml` | 1st of the month, 05:00 UTC |
| `daily-health-digest.yml` | Daily 06:30 UTC |

`full-scrape.yml` and `scrape-pipeline.yml` are manual. See
`instagram-pipeline/APIFY-COST.md` before running a full scrape — they cost real
money.

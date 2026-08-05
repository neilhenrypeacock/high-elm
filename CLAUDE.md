# Hotel Content Radar — repo root

One product, two halves. This file orients you at the top level; the detail
lives in the per-area `CLAUDE.md` files, which are the real documentation.

| Path | What it is | Runs on |
|---|---|---|
| `hotel-dashboard/` | The Next.js app members log into, and the public landing page | Vercel (project **dashboard**), auto-deploys from `main` |
| `instagram-pipeline/` | Scrapers, the AI insight generator, the health digest | GitHub Actions, on a schedule |
| `docs/` | Dated reviews, audits and handoffs — history, not truth | — |
| `keys/` | Real credentials. **Gitignored** (`keys/.env.*`) | — |
| `client-reports/` | Client-facing analysis. **Gitignored — see below** | — |

Read `hotel-dashboard/CLAUDE.md` before touching the app and
`instagram-pipeline/CLAUDE.md` before touching the pipeline. For the system in
plain English, `hotel-dashboard/docs/how-it-works.md`.

## ⚠ This repository is PUBLIC

Anything committed here is world-readable. `keys/` and `client-reports/` are
gitignored for that reason — `client-reports/` holds named-prospect sales
analysis, which must never be pushed. Check `git status` before committing
anything you didn't write yourself.

## Do not rename `hotel-dashboard/`

The path reads "hotel" twice and the urge to shorten it is understandable.
Resist it. That exact rename — `dashboard/` → `hotel-dashboard/` on 4 Jul 2026
— silently disabled CI for a month, because the workflow's path filter simply
stopped matching and a workflow that doesn't run reports nothing.

The name is now coupled to four places, and only three are in this repo:

1. `.github/workflows/dashboard-ci.yml` — `working-directory` and `cache-dependency-path`
2. `.claude/launch.json` — the dev server
3. Every doc path, including this file
4. **Vercel's Root Directory setting** — lives in Vercel's own dashboard, so no
   pull request and no CI run can catch it being wrong

If it must change, change all four in one go and watch a deploy land afterwards.

## Working practice

- **Branch and open a PR.** Never commit to `main` directly. `main` deploys
  straight to production with no human gate.
- **Never `git reset --hard`.** Neil keeps uncommitted work in the tree —
  hand-edited CSVs, notes, data files. A reset destroyed two of them on
  5 Aug 2026. Use `--soft`, `git revert`, or name specific paths.
- **CI runs on every push with no path filter, deliberately.** Don't add one:
  a filter that stops matching cannot report that it stopped.
- **Green is not proof.** A check that has never failed may be incapable of
  failing. To trust a safeguard, break something on a branch and watch it go
  red. Four "safeguards" in this project turned out to have no path to failure.
- **Prefer the smallest honest claim.** Figures members can't stand behind get
  removed, not softened — see the Michelin Keys note in `Landing.tsx` and
  `docs/review-findings-2026-08-04.md`.

# docs/

Point-in-time records: reviews, audits and session handoffs. **Everything here
is dated and none of it is maintained.** Each file was true on the day it was
written and has been going stale ever since — read them as history, and check
any claim against the code before acting on it.

Living documentation lives elsewhere and *is* kept current:

| Where | What |
|---|---|
| `/README.md` | What this repo is |
| `/CLAUDE.md` | Repo-wide orientation + the rules that stop expensive mistakes |
| `hotel-dashboard/CLAUDE.md` | The dashboard in detail — data model, design system, gotchas |
| `hotel-dashboard/docs/how-it-works.md` | The whole system in plain English |
| `instagram-pipeline/CLAUDE.md` | The scrapers and the AI insight generator |

## What's in here

| File | Date | What it is |
|---|---|---|
| `review-findings-2026-08-04.md` | 4 Aug 2026 | The current review: 10 findings worst-first, a reconciliation of the two audits below, a data-health audit and the launch checklist. **Start here** — it supersedes the other two. |
| `status-audit-2026-07-31.md` | 31 Jul 2026 | 43 findings; reconciled into the 4 Aug review. |
| `review-findings-2026-07-09.md` | 9 Jul 2026 | 24 findings; reconciled into the 4 Aug review. |
| `SESSION-2026-08-04.md` | 4 Aug 2026 | Handoff after the Phase 1 review and the daily health digest. Its open items were largely actioned on 5 Aug — CI, the publish gate and the insight backfill are all done. |
| `RESUME-2026-08-03.md` | 3 Aug 2026 | Handoff from the Michelin/leaderboard work. |
| `IMPLEMENTATION_LOG.md` | 30 Jun 2026 | How the dashboard was originally built. The oldest thing here and the most likely to mislead. |

Moved here on 5 Aug 2026 — they were previously split between the repo root and
`hotel-dashboard/`, including two review-findings files at different levels.

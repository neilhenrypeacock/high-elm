# Hotel Content Radar — Full Codebase & Production-Flow Review
**Date:** 9 July 2026 · **Type:** Read-only audit (nothing was changed) · **Reviewed against HEAD:** `d6e0188`

---

## 1. Bearings

- **Repo:** `/Users/neilpeacock/Projects/high-elm/` confirmed — one monorepo containing `hotel-dashboard/` and `instagram-pipeline/` (plus `demos/`, `outreach/`, `website/`, `templates/`, `keys/`, others).
- **Git:** HEAD is `d6e0188` ("Dashboard: Save (posts) + Watchlist (hotels)…"), `main` in sync with `origin/main`. The two audited folders are **clean**. ⚠ Note: `git status` shows modified/untracked content inside `demos/athena`, `demos/athena-portugal`, `demos/bramble-ski`, `demos/safari-edit` and `outreach` — these are **separate embedded git repos** (not part of this repo's history) with their own uncommitted work sitting in them. Outside this audit's scope, but you should know that work is unsaved there.
- **Build:** `npm run build` — **passes** (exit 0).
- **Lint:** `eslint .` — **clean**.
- **Tests:** `vitest run` — **39/39 pass** (one file, `tests/data.test.ts`).
- **Database (live, read-only):** hotels 465 (205 tracked) · posts 7,440 · profile_snapshots 1,029 · standout_posts 16 · insights 3 · subscriptions locked to service-role (anon read returns nothing — correct).
- **Data freshness:** newest post **2 Jul 2026 09:00**, newest snapshot **2 Jul 2026 10:55** — the pipeline has not run for **7 days**.

## 2. Headline

The codebase itself is in genuinely good shape — strict TypeScript with zero `any`, a clean build, well-commented code, sensible defensive patterns, and the delicate breakout maths is properly unit-tested. **But one thing overrides everything else: the production dashboard is wide open right now.** `https://www.hotelcontentradar.com/dashboard` serves the full paid product — real breakout posts, leaderboard, Instagram links — to anyone, with no login (verified during this review). The cause is the `UNGATED_DEV_MODE` escape hatch, which the code allows to switch off auth even in production and which appears to still be enabled in the Vercel environment. Fixing that is a five-minute job and should happen before anything else. After that, the biggest real-world risks are operational, not code: a manually-run pipeline with no schedule and no alarm when it goes stale (it's stale now — the "this week" feed is empty), and no error monitoring anywhere.

## 3. Findings

### 🔴 Critical

#### C1. The production dashboard is publicly accessible with no login — right now
- **What it is:** `www.hotelcontentradar.com/dashboard` (and the vercel.app URL) returns the full dashboard — real data, "Log out" button and all — with HTTP 200 instead of redirecting to `/login`. I verified this live during the review. The code in [require-access.ts:25-28](hotel-dashboard/lib/require-access.ts) contains a bypass: if the env var `UNGATED_DEV_MODE=true` is set, the gate is switched off **with no production guard whatsoever** (unlike `DISABLE_DASHBOARD_AUTH`, which is correctly restricted to non-production). Commit `b4363cd` ("Trigger production rebuild with UNGATED_DEV_MODE") shows it was deliberately enabled on Vercel during development; the evidence says it was never removed. The STATE note's 8 Jul claim that the gate was verified live is no longer true today.
- **Why it matters:** the entire paid product is free to anyone with the URL — including search engines and any prospect you've ever sent a link to. When you start charging, this is revenue leaking; today, it undermines the paywall story on the landing page.
- **Recommended fix:** (1) Delete `UNGATED_DEV_MODE` from Vercel's production environment and redeploy — five minutes, no code change. (2) In a follow-up brief, remove the `prodDevMode` code path entirely (or re-guard it on `VERCEL_ENV !== 'production'`) so this can never happen again. The code's own comment says "REMOVE THIS FLAG before going to real users."
- **Effort:** small.

### 🟠 Important

#### I1. The pipeline is 7 days stale, with no schedule and no alarm
- **What it is:** newest post and snapshot are both from 2 Jul. The pipeline is run by hand (`npm run full`), there is no scheduler, and nothing warns anyone when data goes stale. Knock-on effects visible right now: the 7-day breakout feed is **empty**, so the dashboard's hero and the landing page's "X posts outperformed this week" sales numbers are running on fumes.
- **Why it matters:** a paying customer opening a "weekly radar" and finding last week's data — or an empty "this week" — is the fastest way to a cancellation. The landing page's live counters are also a sales asset that quietly degrades.
- **Recommended fix:** a future brief should (a) put the scrape on a schedule (cron / GitHub Action / scheduled Cloud task), (b) add a freshness check that alerts you (email/Slack) when max(posted_at) is older than N days, and (c) optionally show a graceful "data refreshing" state on the dashboard when stale. Do not change scrape logic — just wrap it in automation.
- **Effort:** medium.

#### I2. No error monitoring anywhere
- **What it is:** the app has a branded error page ([app/error.tsx](hotel-dashboard/app/error.tsx)) and API routes fail politely, but errors go only to `console.error`. There's no Sentry/alerting on the dashboard, the webhook, or the pipeline.
- **Why it matters:** if the Stripe webhook starts failing (so paying customers never get access), or `getPortfolioData` starts throwing, you will find out from an angry customer email, not from a system.
- **Recommended fix:** add an error-reporting service (Sentry has a free tier and a first-class Next.js integration) to the dashboard and webhook, plus a simple failure summary at the end of pipeline runs.
- **Effort:** small–medium.

#### I3. The AI "why it worked" layer has almost no coverage — and its script is in limbo
- **What it is:** `standout_posts` has only **16 rows**, yet the breakout lists show up to 100 posts per window and both the dashboard and the landing page render `post_insight` / `theme_tag` when present. So ~all current breakout cards show no insight line. The only writer of that data, `generate-insight.js`, isn't wired into any npm script and the two CLAUDE.md files disagree about whether it's still part of the pipeline (the pipeline doc says per-post insights are current; nothing actually runs it).
- **Why it matters:** the landing page explicitly sells "The 'why it worked' read" as a feature. Customers will get cards without it. And because nobody runs the script, coverage will stay at 16 forever.
- **Recommended fix:** decide: either `generate-insight.js` is part of every scrape run (add it to the run workflow and backfill), or the insight feature is dropped and the landing copy adjusted. A future brief should implement whichever you choose.
- **Effort:** medium.

#### I4. Go-live manual steps are still outstanding (reconciled list)
- **What it is / status of each (STATE note §4):**
  1. ~~Vercel env vars~~ — **done** (verified 8 Jul; names present).
  2. **Production Stripe webhook registration** — cannot be verified from code; needs you to check the Stripe Dashboard (Developers → Webhooks) that an endpoint for `https://www.hotelcontentradar.com/api/webhooks/stripe` exists and its signing secret matches Vercel's `STRIPE_WEBHOOK_SECRET`.
  3. **Real SMTP sender in Supabase Auth** — cannot be verified from code. Without it, magic links are rate-limited to a handful per hour: **a customer who pays and never receives their login email is the single worst onboarding failure possible.** Treat this as a blocker for charging real money.
  4. **Supabase Auth redirect URLs** must include `https://www.hotelcontentradar.com/auth/callback` — dashboard check.
  5. **Stripe test→live key swap** — correctly still pending (test mode confirmed in use).
  6. **Enable Stripe Customer Portal** — the code fails gracefully if it's off ([billing-portal/route.ts](hotel-dashboard/app/api/billing-portal/route.ts)), but "Manage billing" won't work until enabled.
- **Why it matters:** every one of these is invisible until a real customer hits it.
- **Recommended fix:** work through 2, 3, 4, 6 in the dashboards now (they're free and safe in test mode); leave 5 for launch day.
- **Effort:** small (your time, not code).

### 🟡 Minor / cleanup

#### M1. ~5% of post images point at expiring Instagram URLs
319 posts have `cdninstagram.com` URLs and 59 have `fbcdn.net` URLs (378 of 7,440; the other 7,061 are permanent Supabase Storage URLs — the scraper's design is working). These are older posts whose image upload failed or predates the upload step; their links expire and the card falls back to the placeholder gradient (graceful, not a crash). *Fix:* a one-off backfill re-scrape of those posts, guided by the existing `check-images.js` diagnostic. *Effort:* small.

#### M2. 20% of posts are invisible to all stats (null likes)
1,460 posts have `likes_count = NULL` and 33 have `-1` (hidden likes) — all correctly excluded everywhere engagement is computed (verified: the exclusion is consistent across ER, baseline, breakouts and What's Working). But it means a fifth of the scraped history contributes nothing. Worth understanding why so many nulls (older scrape format?) before the next big top-up run. *Effort:* small (investigation).

#### M3. Documentation drift — one reconciliation list
The code moved faster than the docs. For a future docs brief:
1. `hotel-dashboard/CLAUDE.md` says `/dashboard` is "PUBLIC — no auth/gate yet" — auth is built and live in code (five gated pages via `require-access.ts`).
2. Same file describes `lib/supabase.ts` as "service role" — it's now anon-key-first with service-role fallback.
3. Same file's table list says posts are "upserted on post_id" — it's the composite `(post_id, instagram_handle)` (the file even says so correctly 20 lines earlier).
4. Same file says dev port 3200; `.claude/launch.json` says 3000.
5. `instagram-pipeline/CLAUDE.md` points to `../dashboard/` — folder is `../hotel-dashboard/`.
6. `instagram-pipeline/README.md` says "full run (all 465 hotels)" — a full run scrapes only the ~205 tracked handles.
7. The CLAUDE.md file-structure section predates the auth/account-shell era — it lists none of `/login`, `/subscribe`, `/profile`, `/settings`, `/saved`, `/watchlist` or `app/api/*`.
(The key-constants table, breakout method description, and collab handling in CLAUDE.md are all **accurate** — checked value by value.)

#### M4. Gated *write* APIs check login but not subscription
`/api/saves`, `/api/watchlist`, `/api/profile`, `/api/billing-portal` return 401 to logged-out users (good) but don't check for an *active* subscription — a canceled member with a live session can still save posts and edit their profile. No dashboard data leaks (all data is rendered inside the gated pages), so this is tidiness, not a hole. *Fix:* reuse the `hasActiveAccess` check in those routes. *Effort:* small.

#### M5. Public endpoints have no rate limiting
`/api/checkout` (creates Stripe sessions) and `/api/auth/magic-link` (sends emails) accept any request. A bot could spray checkout sessions or spam magic-link emails. Low stakes in test mode; add basic rate limiting (Vercel firewall rules or Upstash) before real launch. *Effort:* small.

#### M6. The saves API stores whatever JSON the client sends
`/api/saves` validates `post_id` and `instagram_handle` but stores the entire client-supplied `post` object as the snapshot, unvalidated and unbounded in size. A malicious member could store junk megabytes. *Fix:* whitelist the snapshot fields server-side. *Effort:* small.

#### M7. Stripe webhook robustness niggles
Signature verification is solid (and was proven with tampered requests). Two small things: (a) the Stripe status is cast without validation — an unexpected status like `paused` gets written raw (harmless today: the gate only honours `trialing`/`active`, and the table has no CHECK constraint to reject it, so nothing breaks); (b) `customer.subscription.updated`/`deleted` for an unknown subscription ID silently updates zero rows. Both worth a log line. *Effort:* small.

#### M8. Pipeline idempotency: posts yes, snapshots no
Re-running a batch is safe for `posts` (composite-key upsert — confirmed) and images (storage upsert). But `profile_snapshots` is INSERT-only, so a re-run adds a duplicate snapshot row per hotel for that day. It doesn't corrupt anything (the dashboard takes the newest row), it just pads the history. Also worth knowing: a batch that dies mid-run leaves earlier hotels written and later ones untouched — safe to re-run, by design, and `full-run.js` continues past failed batches and reports skipped handles. *Effort:* small (dedupe on insert or accept it).

#### M9. Performance: every dashboard request recomputes everything
The gated pages are fully dynamic (auth cookies force it), so **each** dashboard view fetches ~8,500 rows across ~10 paginated Supabase queries and recomputes all metrics. At today's scale that's fine (sub-second-ish) and the public landing page is cached (ISR, 1 hour), which protects the anonymous-traffic path. This becomes a real cost around thousands of posts more or dozens of concurrent members. *Fix later:* cache `getPortfolioData()` (e.g. `unstable_cache` with a 15–60 min TTL) — the data only changes when the pipeline runs. *Effort:* small–medium, not now.

#### M10. Database housekeeping
- `profile_snapshots` growth is a non-issue for years (1,029 rows total; ~205/run, indexed on handle + captured_at).
- Useful indexes exist for every hot read path (`posts` by handle and posted_at; snapshots; saves/watchlist by user). The composite `(post_id, instagram_handle)` unique key backs the upsert. Nothing missing that matters today.
- No orphans found: all 16 `standout_posts` rows match existing posts; `subscriptions`, `saved_posts`, `watchlist_hotels` refused anon reads (RLS correct).
- The `insights` table (3 rows) is written and read by nothing — a candidate to drop later (see §4).

### 🟢 Healthy — checked and confirmed good

- **Secrets hygiene:** no `.env` files or key values in git history-tracked files (`git ls-files` shows only `.env.example` files and `keys/README.md`, which contains *pointers*, not values). Root `.gitignore` covers `.env*` and `keys/.env.*`. The service-role key is only used in server-side code (`lib/subscriptions.ts`, `lib/supabase.ts` fallback, pipeline) — never in client components; the browser bundle gets no Supabase key at all (all queries are server-side).
- **Stripe webhook signature verification** is implemented correctly (raw body + `constructEvent`; tampered requests were proven to get 400 during the 3 Jul build).
- **RLS posture matches intent** (verified live): the five content tables are anon-read-only (writes refused); `subscriptions` is service-role-only; `saved_posts`/`watchlist_hotels` are keyed to `auth.uid()`. The `standout-images` bucket is public by design (images are shown on a public landing page).
- **The auth gate design is sound** (the env-flag bypass aside): one shared `requireActiveUser()` used identically by all five gated pages — no page rolls its own; mutation APIs check the session; there is no ungated API that returns dashboard data.
- **The breakout maths is unit-tested** — the exact thing that broke production before is now covered: the 2× threshold, the `MIN_ENGAGEMENT` (100) and `MIN_BASELINE_ENGAGEMENT` (25) floors, the `likes_count = -1`/null exclusion, median behaviour, and `computeStandout` end-to-end (10 tests). The 39 tests are real protection, not decoration. (Gap worth knowing: `getPortfolioData` itself — pagination, dedupe, follower-lookup — is untested because it hits Supabase; an integration test would be the next-best addition.)
- **TypeScript health is excellent:** `strict: true`, zero `any`, zero `@ts-ignore`, zero eslint-disables, no ignored build errors; the five non-null assertions are all guarded or env-var asserts.
- **Data-layer defensiveness is thoughtful:** pagination uses unique sort tiebreakers to avoid page-boundary row skips, dedupes mid-fetch against pipeline uploads, degrades gracefully if `standout_posts` is missing, and handles zero-post/hidden-likes hotels without dividing by zero. `week_ending` honestly reflects the data's newest post, not the render date.
- **Pipeline attribution logic is correct for collabs:** posts are grouped by the grid scraped (`inputUrl`), stored once per partner grid on the composite key, and the dashboard measures each copy against its own hotel's baseline — code and docs agree.
- **The scraper's image-permanence design works:** 95% of all post images are already on Supabase Storage URLs that never expire, and the fallback chain (stored URL → CDN URL → branded placeholder) means a dead image never breaks the page.
- **The FilterSet redesign left zero residue**, and the 8 Jul preview-only auth bypass was genuinely added and fully removed (`35fd153` → `c05dd75`) — no trace on `main` beyond the two documented env flags.

## 4. "Safe to delete later" list

Nobody deletes anything today. For a future cleanup brief:

| Item | What it is | Confidence |
|---|---|---|
| `insights` table + `instagram-pipeline/setup-insights.sql` | Legacy weekly-prose feature; written and read by nothing since 1 Jul | High — after exporting the 3 rows if sentimental |
| `instagram-pipeline/remaining-handles.js` | Hardcoded list of ~100 handles from a past Apify quota event; stale after any top-up | High — or rewrite to read skips dynamically |
| `instagram-pipeline/check-images.js`, `audit-post-counts.js` | Read-only diagnostics; keep until the M1/M2 backfills are done, then archive | Medium |
| `components/StandoutPosts.tsx` | Unreferenced legacy grid (CLAUDE.md says keep for reference — your call) | High it's unused; keep/delete is preference |
| `components/TrendPanel.tsx` | Unreferenced stub for a future feature | Keep if trends are still planned |
| `hotel-dashboard/scripts/verify-callback.mjs` | One-off local diagnostic for the magic-link flow | Medium |
| `UNGATED_DEV_MODE` code path in `lib/require-access.ts` | The critical-finding bypass — delete the code once the env var is removed | High |
| `generate-insight.js` | **NOT safe to delete** — it's the only writer of the insight/tags the UI displays; decide its fate first (finding I3) | — |

## 5. Recommended fix order (safest & highest-impact first)

1. **Today, 5 minutes:** remove `UNGATED_DEV_MODE` from Vercel production env, redeploy, and confirm `/dashboard` redirects to `/login` (C1).
2. **This week:** run the pipeline to refresh data (your normal manual run — not done in this review), then brief the scheduling + freshness-alert work (I1).
3. **This week, no code:** work through the Stripe/Supabase dashboard checklist — webhook registration, SMTP sender, redirect URLs, Customer Portal (I4).
4. **Next brief:** delete the `UNGATED_DEV_MODE` code path; add subscription checks + rate limiting + saves-payload whitelist to the API routes (C1 residue, M4–M6); add Sentry (I2).
5. **Then:** decide the fate of the AI insight layer and backfill or drop it (I3); image-URL backfill and null-likes investigation (M1, M2).
6. **When convenient:** docs reconciliation (M3) and the delete-later list (§4); caching for `getPortfolioData` when member count grows (M9).

## Addendum (9 Jul, Pass 2) — M2 null-likes investigation (read-only)

The 1,460 `likes_count = NULL` posts are **not** legacy data: they're concentrated in recent months (652 in Jun 2026, 420 in May, 202 in Apr), span 238 hotels, and are 77% carousels (1,119 Sidecar + 322 Image + 19 Video). Several hotels have ~all 30 of their scraped posts null (e.g. forestis.dolomites 30/30). Conclusion: these are Instagram **hidden like counts** — Apify returns `null` for them (the documented `-1` convention accounts for only 33 older rows). Everything is handled correctly by `hasVisibleLikes` (both excluded), so this is a coverage limitation, not a bug. Two real consequences worth knowing: (1) hotels that hide all their likes get no baseline and can never surface a breakout; (2) carousels are disproportionately hidden, so the "What's Working — by format" chart understates carousels. No action required now; if it starts to matter, per-post `commentsCount` is still present and could ground a comments-only fallback metric (a product decision, not a quick fix).

## 6. Self-verification

- [x] I changed **no** application code, constants, database rows, or deployment. (All database access was read-only over the REST API with the anon key; production checks were plain GET requests.)
- [x] I did **not** run any Apify/scraping script.
- [x] The git working tree is as I found it, apart from this single untracked `review-findings-2026-07-09.md` — nothing staged or committed. (The pre-existing modified submodule-style entries in `demos/` and `outreach` were there before I started and are untouched.)
- [x] No secret values appear in this report or the STATE note — env vars are referred to by name only.
- [x] Every 🔴 and 🟠 finding has a plain-English "why it matters" and a recommended fix.

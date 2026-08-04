# Review Findings — 4 August 2026

*Phase 1 of the launch-readiness brief. Read-only: nothing in this review changed any
code, data, or setting. Produced from a 19-agent parallel review (reconciliation of
both prior audits, six system fact-sheets, five risk hunts, launch verification, and
a 17-check live data-health audit run immediately after today's scrape landed).
Companion teaching document: [docs/how-it-works.md](docs/how-it-works.md).*

**Honesty note on method:** the planned adversarial re-verification of every "FIXED"
classification could not run (it hit an API session limit). Mitigation: every FIXED
claim below carries its commit/PR evidence, and the highest-stakes ones were
independently confirmed anyway — the auth gate was probed live twice today, the
sentinel fix verified by live SQL (0 rows), the display cap and Michelin removal
verified at file and line. Treat single-source FIXED items with one notch less
certainty.

**Context recorded, not judged:** 107 Michelin-Key hotels were inserted into the
`hotels` table today 15:01–15:03 UTC (untracked, no posts), and the working tree has
uncommitted edits to two `hotel-lists/*.csv` files — this looks like Neil's parallel
work today and was left untouched by this review.

---

## 1. Headline findings (new since the last audits, worst first)

Severity is rated *as if charging real money* — that's the standard that matters now.
"Fix" lines are recommendations only; nothing was changed.

### 1. HIGH — Continuous Integration has never run: the safety net is a painted net
`.github/workflows/dashboard-ci.yml` watches a folder called `dashboard/` — but the
app lives in `hotel-dashboard/`. The path filter never matches, so the type-check /
lint / test workflow **has never executed on any push or PR**. Every "must pass
before shipping" gate is manual convention; a broken `main` deploys straight to
production via Vercel. This is the same failure class as the last three incidents:
a safeguard that looks real but cannot fire.
**Fix:** one line — change the path filter to `hotel-dashboard/**`. *(Claude-buildable, 5 minutes.)*

### 2. HIGH — A part-way Apify failure still ingests partial data with a green tick
`scrape.js` logs the Apify robot's final status but never *checks* it. If the
post-collector dies after 30 of 50 hotels in a batch, the partial results upsert
cleanly, nothing throws, the new zero-result guard (PR #72) passes (posts > 0), and
the freshness alarm passes (it checks only the single newest post across *all*
hotels). Twenty hotels silently miss the week. Related: a *partial* run (up to 3 of
4 batches failed = ~150 hotels missed) also exits green by design, with no
escalation if it repeats.
**Fix:** throw when the actor run status isn't `SUCCEEDED` (the existing batch
error-handling then does the right thing); escalate when ≥50% of batches fail.
*(Claude-buildable; the Phase 2 digest's per-hotel snapshot-coverage check is the
belt-and-braces detector for whatever still slips through.)*

### 3. HIGH — A failed AI call erases existing editor's notes
When `generate-insight.js` can't get an answer from Claude for a post (outage,
quota), it writes **null over whatever was already there** — including a note Neil
set by hand. A successful weekly run also *overwrites* any manual note on a post
that's still in the top 10. Neil's editorial work can be silently destroyed by a
routine Monday run.
**Fix:** when the AI returns nothing, don't write the insight/tag columns at all;
optionally never overwrite a non-null note without an explicit flag. *(Claude-buildable, small.)*

### 4. HIGH — If a Stripe webhook goes missing, a trial member keeps access forever
`hasActiveAccess` only enforces the trial-end date for rows *without* a Stripe
subscription id. For real Stripe-managed trials it trusts the webhook to flip the
status — so a webhook outage lasting past Stripe's ~3-day retry window (or a rotated
signing secret, or a changed URL) means a `trialing` row stays valid **indefinitely,
without paying**. Nothing self-heals and nothing alerts (webhook rejections are
handled errors — invisible to Sentry).
**Fix:** deny `trialing` rows whose `trial_end` is more than ~3 days past regardless
of Stripe id (a grace window covers webhook lag). *(Claude-buildable, ~5 lines + tests.)*

### 5. HIGH — An already-subscribed member can accidentally subscribe twice
`/api/checkout` never checks for an existing subscription — the only guard is the
button's visibility. A stale tab, a second device, or a completable old Checkout
session (they stay live ~24h) creates a **second live Stripe subscription on the
same email**. The database row then points only at the newer one; the older keeps
billing invisibly, and each re-checkout grants a fresh 14-day trial.
**Fix:** at the top of checkout, return "you already have an active plan → manage
billing" when `hasActiveAccess` is true or a subscription id exists. *(Claude-buildable, small.)*

### 6. HIGH — Zero automated tests on every money- and gate-touching function
The test suite (99 tests) covers the statistics engine well — and covers **none** of:
`hasActiveAccess` (the paywall's only decision function), the Stripe webhook
handlers, checkout price selection, `requireActiveUser`/`checkApiAccess`, the
admin allowlist, or the rate limiter. A regression in any of these ships silently
(see finding 1 — CI wouldn't run the tests anyway).
**Fix:** a table-driven test file for `hasActiveAccess` first (~10 lines, catches
finding 4's class), then webhook status-mapping tests. *(Claude-buildable.)*

### 7. HIGH — Every member page load recomputes everything: ~8.6 MB and 17 database round-trips
`getPortfolioData()` runs fresh on every gated page view — 17 sequential Supabase
requests, ~8.6 MB transferred, multi-second server time, growing ~1 extra request
every two weeks as posts accumulate. Ten members refreshing at 9am Monday = ten
full recomputes. (Also: ~28% of the download is posts from *untracked* hotels,
fetched then discarded.)
**Fix (smallest):** cache the computed member view for 10 minutes
(`unstable_cache`), explicitly refreshed by the Publish button so Monday stays
instant; then filter the posts query to tracked hotels. *(Claude-buildable; verify
the cached object stays under Vercel's 2 MB cache-entry limit or the cache silently
no-ops.)*

### 8. MEDIUM — Webhook events can arrive late or twice and be believed
Stripe retries failed deliveries for days and doesn't guarantee order. The handler
applies whatever arrives: a stale `subscription.updated` (status `active`) delivered
*after* a cancellation resurrects a canceled member's access.
**Fix:** on update events, re-fetch the subscription's *current* state from Stripe
(the checkout handler already does exactly this) — makes late/duplicate events
harmless. *(Claude-buildable, small.)*

### 9. MEDIUM — Two rough edges on the paid journey itself
(a) On returning from a successful Stripe Checkout, the redirect races the webhook —
a just-paid customer can bounce to `/start-trial` until refresh, with no
explanation. (b) The webhook still fires a vestigial magic-link email after
checkout, so a logged-in customer who just paid gets a confusing "here's your login
link" email. Both are first-hour-of-being-a-customer impressions.
**Fix:** a brief "setting up your account…" interstitial/poll on the success URL;
delete the `sendMagicLink` call. *(Claude-buildable.)*

### 10. MEDIUM — First card decline locks a paying customer out same-day
A failed renewal flips the row to `past_due` and the gate bounces them immediately,
even though Stripe's smart retries usually recover the payment within days. The
member experience is "I was locked out", then silently restored. (The billing-portal
route being session-only means they *can* fix the card — good.) This may be the
product decision you want (strict), but it should be a decision, not an accident.
**Fix if wanted:** treat `past_due` as active for N days with a fix-your-card banner.

**Smaller items (LOW), for completeness:** CSRF protection rests entirely on the
auth cookie's default SameSite behaviour (add an origin check to the shared gates);
`/api/billing-portal` has no rate limit (its siblings all do); the dev menu is
enableable in production via `?devmenu=1` (route leaks only the requester's own
data — accept or 404 it); a crashed insight step skips the image-prune and storage
checks that follow it in the same run (`if: always()` on those steps); the
insight script uploads full-resolution covers (no WebP re-encode) for the 10 posts
it touches; the alert-email helper has no error handling, so a Resend outage would
fail the daily check with a false alarm; the rate limiter clears *all* counters when
its key table overflows.

**Verified clean, for the record:** secrets hygiene is excellent — zero live
credentials in the tracked tree *or anywhere in git history* (pickaxe-searched);
`.gitignore` verified effective on every env file. All six public POST endpoints
are rate-limited. Webhook signature verification is correct. The publish gate can
only be moved by the server clock. Saves/watchlist rows are RLS-locked per member
and snapshots are rebuilt server-side from a whitelist. Both projects: `npm audit`
= 0 vulnerabilities (as of today's PR #72).

---

## 2. Reconciliation of the two prior audits

Nothing from either audit was dropped. Classification counts, then the items that
still need attention. Full per-finding tables with evidence live in the review
transcript; classifications below are the verified end-state.

### review-findings-2026-07-09.md — 24 findings
**14 FIXED · 4 PARTIALLY FIXED · 6 STILL OPEN** (0 superseded, 1 informational superseded)

The critical one (production dashboard ungated, `UNGATED_DEV_MODE`) is FIXED and was
re-verified live today — logged-out `/dashboard` returns a redirect shell with zero
data. Also fixed: freshness alarm + scheduled scrape, Sentry, API subscription
checks, rate limiting, saves whitelist, webhook logging, snapshot dedupe, doc
reconciliation, all the deletion chores.

Still open from 9 Jul, carried into today's checklist:
- **Supabase custom SMTP** — the STATE note says done 9 Jul; the repo holds zero
  evidence. 2-minute dashboard confirm (launch checklist A3). Stakes rose: every
  signup now depends on Supabase-sent email.
- **Stripe live-mode switch** — deliberately deferred to launch; now the blocker (A1).
- **Stripe Customer Portal enablement** — unverifiable from code; confirm in test +
  live (A1/A4).
- ~5% of posts on expiring Instagram CDN image links (403 rows, mostly defused by
  the placeholder fallback — housekeeping).
- `getPortfolioData` caching — deferred then; now finding 7.
- Legacy `insights` table — still a drop candidate (housekeeping).

### status-audit-2026-07-31.md — 43 findings
**9 FIXED · 7 PARTIALLY FIXED · 23 STILL OPEN · 4 SUPERSEDED**
*(Note: this document lives on the `outreach/europe-low-er` branch — PR #66, still
unmerged. Merging #66 is itself a checklist item.)*

Fixed, verified: the entire display-honesty package from 31 Jul (multiplier display
cap at 50×+, headline exclusion, Michelin Keys removed from "Sources crawled" and
the landing strip, "Your hotel" hidden from the sidebar), and the full hidden-likes
sentinel repair (pipeline normalisation + 813-row backfill — live count today:
**zero** rows at `likes_count = 3`, including today's 918 fresh posts).

The big still-opens are all *decisions*, not defects: the tracking-set expansion
(ranked CSV exists — 192 keep / 23 drop / 544 need a sample scrape; expansion breaks
the $40 Apify cap without a plan change), Design Hotels cohort (299 rows, zero
data), 50 orphan handles (~1,500 already-paid-for posts invisible for want of
`hotels` rows), sub-Saharan Africa coverage, and `setup-tracked.sql` being a full
reset that would clobber a curated set. One count updated: every Michelin-Key hotel
is now at least a DB row (the "107 aren't even rows" era ended today), but tracked
in the *product* is still 20 of 139.

---

## 3. Data health audit (run ~15:30 today, after the scrape settled)

**17 checks: 14 GREEN · 2 AMBER · 1 RED (and the red is a known, documented state).**

| Check | Status | Result in one line |
|---|---|---|
| Sentinel spike scan, likes 0–199, 90d | ✅ | 3,398 rows, natural spread — no value spikes; the "next 3" isn't there |
| `likes_count = 3` fix held | ✅ | **0 rows in the entire table**, including today's 918 posts |
| Sentinel scan, comments | ✅ | textbook decay curve, clean |
| `-1` sentinel recency | ✅ | 96 rows, all pre-fix (24 Jun–27 Jul); zero since — optional tidy to null |
| Comments-high/likes-low contradictions | ✅ | 7 rows, all the old `-1` marker, all already excluded from stats |
| Null-likes ratio drift | ✅ | 7.9% this week vs 16.4% norm — *improved*; scraper healthier than usual |
| Zero-likes as sentinel | ✅ | not a thing — only 2 all-time, both scraped minutes after posting |
| Newest post | ✅ | today 14:30 UTC — exactly what the scrape should deliver |
| Per-hotel freshness | ✅ | 195/205 posted within 10 days; every hotel posted since April |
| Dormant vs scrape-failed | ✅ | **200/200 hotels snapshotted today** — the 3 quiet ones are genuinely quiet |
| Snapshot duplicates | ✅ | zero — the 9 Jul dedupe holds |
| Follower shocks (>20%) | ✅ | none; biggest move +3.7% (Royal Mansour) |
| Orphan handles | ✅ | 50 (down 1 from baseline 51); none new |
| Country/region hygiene | ⚠️ | regions exactly the 7 expected; country has 4 spelt-two-ways pairs (US 89/39 the big one) — cosmetic until a country filter exists |
| Hotels totals | ✅ | 871 rows / 205 tracked / 0 hidden (docs say 465 — stale; includes today's 107 Michelin inserts) |
| `contacts` table | 🔴 | 0 rows — table exists, nothing has ever written to it (matches the 31 Jul audit; the 30 Jul work created schema + CSV exports, never imported) |
| Publish gate | ⚠️ | last published 30 Jul — **375 newer posts held back; Monday publish now overdue** (the gate working as designed; action is yours in /admin) |
| Editorial flags | ✅ | 54 rows, 41 insights, 3 picks, 8 pins — exactly as expected post-PR #71 |
| Subscriptions | ✅ | 1 row, `active` (your hand-granted founder row; never expires by design) |
| Multiplier sanity | ✅ | top: 113.6× and 89.3× — real posts on weak-median hotels; the 50×+ display cap handles both; no absurd values |

Side finding worth a quiet cleanup: 12 junk `posts` rows with a profile URL as
their id and no date — invisible to every view, pure cruft.

---

## 4. Launch checklist — "before you sell"

Ordered by severity. **Who:** 🧍 = Neil manual (dashboard/settings), 🤖 = Claude-buildable.

### Bucket A — blockers (cannot take money until done)

**A1. 🧍 Switch Stripe to live mode — the one hard blocker.** Verified today:
production Vercel has exactly 8 env vars (both price IDs present, `SENTRY_DSN`
present, `DISABLE_DASHBOARD_AUTH` and `STRIPE_DISABLED` correctly absent); local
keys are `sk_test_`; the setup script refuses live keys without an explicit flag —
everything still test mode by design. To go live:
1. Stripe dashboard → activate the live account (if not already).
2. Locally: put the live `sk_live_…` key in `.env.local`, run
   `STRIPE_ALLOW_LIVE=true node scripts/stripe-setup.mjs` → prints two live price ids.
3. https://dashboard.stripe.com/webhooks → add live endpoint
   `https://www.hotelcontentradar.com/api/webhooks/stripe` (events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`) → copy its `whsec_…`.
4. https://vercel.com → dashboard project → Settings → Environment Variables →
   Production: replace `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_FOUNDING_PRICE_ID`, `STRIPE_STANDARD_PRICE_ID` → redeploy.
5. **Confirm:** a real card completes checkout at **£49.00/month with 14-day
   trial**; a `subscriptions` row appears; Manage billing opens the live portal.
   Also enable the live Customer Portal and Stripe's own email alerts for failed
   webhooks + disputes while you're in there.

**A2. 🧍 Confirm the three Supabase auth settings** (2 minutes, fatal-if-wrong,
invisible to code):
- https://supabase.com/dashboard/project/dndefddhocxqczinfpfg/auth/providers →
  Email → **Confirm email = ON**
- …/auth/url-configuration → Redirect URLs include BOTH
  `https://www.hotelcontentradar.com/auth/callback` **and** `…/auth/new-password`
- …/auth/templates → *Confirm signup* links to
  `/auth/callback?token_hash={{ .TokenHash }}&type=signup`; *Reset password* same
  with `type=recovery`

**A3. 🧍 Confirm the custom email sender (SMTP).** The STATE note says this was done
9 Jul (Resend, verified highelmstudio.com sender); the repo can't see it and holds
no evidence. …/settings/auth → SMTP Settings should show a configured Resend
sender. If it's Supabase's default sender, real signups will be throttled at ~2
emails/hour — a genuine launch-stopper.

**A4. 🧍 One full end-to-end test, incognito:** fresh email → signup → confirmation
email arrives (checks A2+A3 in one go) → login → /start-trial → test-card checkout
→ dashboard opens. After A1, repeat once with a real card.

**A5. 🤖 Recommended before the first real charge (small code fixes):** findings
4, 5 and 8 — trial-expiry grace enforcement, the double-checkout guard, and
webhook re-fetch. Not strictly "cannot take money", but each is a
real-customer-money bug with a small fix; doing them first is cheap insurance.

### Bucket B — credibility risks (a paying customer would notice in week one)

1. **🤖 Fix dead CI** (finding 1) — one line. The guardrail for everything else here.
2. **"Why it worked" coverage: 41 notes.** Each weekly run now adds up to 10 — but
   only non-collab posts, and no history. A one-off backfill across the historical
   breakout set (~200–300 posts) would cost roughly **$10–25 of AI spend** — your
   go/no-go. 🤖 sizes and runs it on approval. Also a product decision: collab
   breakouts can currently *never* get an AI note.
3. **/hotel is a fictional hotel** (labelled, hidden from nav, reachable by URL).
   Decide: leave as demo, or hold it back entirely until real data.
4. **🤖 Dashboard speed** (finding 7) — the 10-minute cache + publish-refresh.
5. **Freshness framing:** "This week" data lands Monday ~08:30–09:00 UK (cron 05:00
   + GitHub's habitual delay). Fine — but a *monthly* scrape failure currently has
   no watcher (weekly keeps the freshness alarm green). The Phase 2 digest covers it.
6. **🧍 Founding counter is hand-edited** (`FOUNDING_PLACES_TAKEN`, currently 0):
   each sale = edit + commit + deploy, or "20 of 20 places left" drifts false.
   Fine at 20 seats — just an ops fact to remember on day one.
7. **🤖 The two paid-journey rough edges** (finding 9) — the post-checkout race
   message and the vestigial magic-link email.

### Bucket C — housekeeping (real, not urgent)

Country spelling pairs (US/USA + 3 others) · 50 orphan handles (~1,500 paid-for
posts invisible; adding rows would surface them at zero scrape cost) · Design
Hotels cohort decision (299 rows, needs Apify budget) · the 764-hotel ranking CSV
awaiting your keep/drop call (192/23/544) · `setup-tracked.sql` full-reset trap
(must be fixed before acting on the ranking) · merge or close PR #66 (carries the
31 Jul audit doc + outreach exporter) · **PR #52: recommend close as superseded**
by the Phase 2 digest (multi-recipient alerts land there) · drop the legacy
`insights` table · normalise the 96 `-1` rows · delete the 12 junk posts rows ·
`scripts/verify-callback.mjs` + stale worktree cleanup · commit or discard the two
locally-modified hotel-lists CSVs · doc-drift batch (CLAUDE.md: Featured shelf,
rate-limit list, the `3` sentinel, hotels count 465→871, contacts table missing
from the table list; `full-run.js` references; stale code comments flagged in the
fact sheets).

---

## 5. Phase 2 design confirmation — the daily health digest

The review **strengthened the case**: the "safeguards that can't fail" class now has
four confirmed instances (uninvoked cleanup script, green zero-result scrape, dead
CI path filter, frozen AI prose), and today's audit shows exactly the checks that
would have caught each. Confirming the agreed design, with four adjustments
discovered in review:

| Decision | Status |
|---|---|
| Daily 06:30 UTC, always sends, green or red; missing email = alarm | ✅ unchanged (note: GitHub cron drift means real delivery ~07:30–08:30 UK — acceptable?) |
| Subject `✅ Content Radar healthy — Mon 4 Aug` / `🔴 … 2 issues` | ✅ unchanged |
| To `neil@highelmstudio.com`; from a `highelmstudio.com` sender via existing Resend key | ✅ — and if A3 confirms the verified-domain sender, use it from day one |
| Report-only; zero writes; zero Apify/AI calls; no new tables | ✅ unchanged |
| Absorbs the freshness alarm; retire `freshness-check.yml` in the same PR; close PR #52 as superseded | ✅ **adjusted:** that workflow also runs the daily *storage* check — the digest must absorb both, not just freshness |
| All 16 checks from the brief | ✅ **adjusted:** the auth-gate probe (check 14) must accept Next's streamed-redirect shape — HTTP 200 whose body is a redirect envelope with zero data *passes*; a naive "expect 3xx" would false-alarm daily |
| — | ➕ **proposed addition:** publish-gate staleness — flag when `publish_cutoff` is >7 days old (today it's 5.2 days; a forgotten Monday currently has no watcher) |
| — | ➕ **proposed addition:** actor-status line from the last scrape run's log via the GitHub API (catches finding 2's partial-ingest case until the code fix lands) |

**The gate stands:** Phase 2 does not begin until you approve, and any fixes you
want from Section 1 first are separate sessions with separate briefs.

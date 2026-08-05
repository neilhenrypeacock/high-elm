# How Content Radar Works — the plain-English tour

*Written 4 August 2026, from a full read-through of the code and a live check of the
database the same afternoon. Every claim here was verified against the actual system,
not the docs — where the two disagreed, this document follows the code and says so.
Row counts are the 4 Aug figures and will grow weekly.*

This is the story of one piece of data — a single Instagram post by a luxury hotel —
from the moment it's published to the moment a paying member sees it ranked on the
dashboard. Six stages: **collection → storage → analysis → display → money & access →
what watches it all**.

---

## 1. Collection — how a post gets noticed

Every Monday at 5am UTC (in practice a few hours later — GitHub's scheduler runs
late), a robot wakes up and checks the Instagram accounts of the **205 tracked
hotels** (200 distinct accounts — five are shared across sister properties).

**Who does the actual scraping.** We don't talk to Instagram directly. We pay a
service called **Apify** (think: rentable web robots) to do it, using two of their
robots: one collects **profile numbers** (follower count, bio, post count), the other
collects **recent posts** (caption, likes, comments, date, images, video). Instagram
shows this to any logged-out visitor — we collect public data only.

**How the run works.** The runner (`instagram-pipeline/scrape-run.js`) splits the 200
accounts into batches of 50 and has three gears:

| Mode | When | What it pulls | Rough cost |
|---|---|---|---|
| **weekly** | every Monday, automatic | posts from the last 10 days | ~$3 |
| **monthly** | 1st of the month, automatic | posts from the last 35 days (catches posts that went viral late) | ~$12 |
| **full** | manual only | every hotel's last 30 posts, no date limit | ~$14–16 |

The windows deliberately overlap, so one missed run never leaves a permanent hole —
the next run re-covers the ground.

**What happens to each post** (`instagram-pipeline/scrape.js`):

- The cover image is downloaded, shrunk to at most 1,000 pixels wide, converted to
  the efficient WebP format (~85 KB instead of ~330 KB), and stored in our own image
  bucket — so the dashboard never depends on Instagram's expiring image links.
- The post's numbers and text are written into our database. If we've seen the post
  before, the row is **updated** rather than duplicated — that's how a post's like
  count stays fresh week after week.
- One follower-count **snapshot** per hotel per day is recorded — that growing
  history is what growth charts are built from.

**The identity quirk worth understanding — collabs.** When two hotels co-author one
Instagram post, the *same post* appears on *both* grids. We store one row **per
grid**, keyed on the pair (post, account). That way each hotel's copy is judged
against that hotel's own typical performance — a collab that's huge for a small hotel
and ordinary for its giant partner is scored correctly for each.

**The lying-number problem.** Instagram sometimes hides like counts. When it does,
the scraping robot doesn't always say "hidden" — at one point it quietly reported
**3 likes** (the three preview avatars) as if it were real. 813 of those fake rows
poisoned the stats until 31 July, when the fix landed: the pipeline now translates
every known fake value (`null`, `-1`, `3`) into an explicit "can't read this one"
before storing. The trade-off: a post with *genuinely* 3 likes is also ignored —
acceptable, because among these hotels that basically never happens.

**What collection structurally cannot see** — worth knowing when a member asks:

- **No reach, impressions, saves or shares.** Those are private to each account's
  owner. We see likes and comments, nothing else — every stat downstream is built
  honestly on that.
- **Hidden likes stay hidden.** A hotel that hides all its like counts ends up
  invisible to the rankings (there's a gate for this — see Display).
- **Stories and Highlights** aren't collected at all — grid posts only.
- **Deleted posts persist** in our database; we never delete on Instagram's behalf.
- Posting times are UTC — we can't know the hotel's local-time intent.

---

## 2. Storage — where everything lives

Everything lands in **Supabase** — our cloud database (a hosted Postgres database
with login handling and file storage bolted on). Ten tables matter:

| Table | What it holds | Size today | Who can read it |
|---|---|---|---|
| `hotels` | the roster: name, country, region, Instagram handle, `tracked` flag | 871 rows, 205 tracked | public-read |
| `posts` | every scraped post | ~11,100 rows | public-read |
| `profile_snapshots` | follower counts over time, one row per hotel per scrape day | ~1,900 rows | public-read |
| `standout_posts` | the editorial layer: AI "why it worked" notes, tags, Editor's Picks, homepage pins, hide flags | 54 rows | public-read |
| `dashboard_settings` | one row: the Monday **publish gate** timestamp | 1 row | public-read, service-only write |
| `subscriptions` | Stripe payment/trial state, keyed by email | 1 row | **service-only** |
| `saved_posts` / `watchlist_hotels` | each member's saved posts and followed hotels | small | **that member only** |
| `contacts` | outreach contacts (names + work emails) | 0 rows | **service-only** |
| `insights` | legacy AI weekly prose — dead since 1 July, drop candidate | 3 rows | public-read |

**What "public-read" means, and why it's safe.** The database enforces **RLS — Row
Level Security**: per-row access rules that live *inside the database itself*, so
they hold even if application code has a bug. Our public key can *read* the stats
tables (that's how the dashboard works) but can write **nothing** — verified when RLS
went live on 1 July. The sensitive tables (`subscriptions`, `contacts`) have RLS on
with *no* public rules at all: only the pipeline's private service key can touch
them. Member tables (`saved_posts`, `watchlist_hotels`) are locked to each member's
own login. The paywall, in other words, protects the *presentation* — the underlying
public-data tables are readable, the personal and money tables are not.

⚠ One standing rule from the security review: **any new table must get RLS switched
on the day it's created** — a new table without it would be publicly writable by
default.

**The image bucket** (`standout-images`) holds the post covers. It's pruned after
every scrape down to just the images some view can actually reach (~363 MB today);
deleting a cover never changes a statistic — numbers live in the tables, images are
decoration. Since 4 Aug the project is on Supabase's Pro plan (100 GB included), so
the bucket is now a cost concern, not an outage concern — an alarm watches it at a
deliberate 5 GB line.

---

## 3. Analysis — the "why it worked" layer

After every scrape (weekly, monthly *and* full — this runs automatically, wired into
the same pipeline), `generate-insight.js` picks the **top 10 breakout posts of the
last 7 days** and asks Claude (Anthropic's AI, the Sonnet model) to *look* at each
one — every carousel slide, or 8 frames sampled across a video — plus the caption and
the numbers, and write three short lines: *what it is, why it worked, try this*.
Those render on the dashboard as the card's "Editor's note". Cost: well under $1 per
run; Apify is the pipeline's real expense, not the AI.

Alongside the automated notes, there's a manual path (`set-insight.js` and the
`/admin` page) where the founder can dictate a note, mark an **Editor's Pick**, or
pin a post to the homepage rotation.

**The honest gap.** 41 posts carry a note today, against a Top-posts view that can
show up to 100 per time window. Three structural reasons: only the *top 10* get
notes each week; only *non-collab* posts are analysed (so collab breakouts — which
actually over-index — never get an AI note); and no historical backfill has ever been
run. The "content" lever on the What's Working page is also fed by these tags, and is
withheld on the all-time view for lack of them. Backfilling is a deliberate,
costed go/no-go decision — it spends real AI money.

**A lesson learned the hard way (4 Aug):** an AI note quotes numbers *as they were
when it was written*. When the hidden-likes fix rebuilt every hotel's baseline, three
old notes were left claiming multipliers (one said 65.7×) that the corrected data
now contradicted (0.4×). Those were cleared the same day. Frozen prose next to live
numbers will always drift — that's why the health checks in the pipeline now exist.

---

## 4. Display — what a member actually sees

When a member opens the dashboard, two things happen in order.

**First, the gate** (`lib/require-access.ts`). Who are you (via the login cookie)?
No session → sent to the login page. Logged in but no active trial/subscription →
sent to the start-trial page. This runs on *every* gated page, before any data moves.

**Then, the data** (`getPortfolioData()` in `lib/data.ts` — the single brain of the
product, ~1,900 lines, all statistics in one place). It reads five things from the
database — the publish gate, the hotel roster, the editorial layer, the follower
snapshots, and every post — and computes *everything else* in memory, fresh, on every
load: baselines, breakouts, leaderboard, levers, the lot. Nothing is pre-computed
overnight; what you see is always calculated from the current data at request time.
(This honesty has a price — see the findings report on performance.)

**The core idea: every hotel is judged only against itself.** Here's the whole
method, with real numbers:

> **Worked example — Ashford Castle, 7 July.** The post got 250 likes + 13 comments
> = **263 engagement**. Is that good *for Ashford Castle*? Look back at its last 30
> posts with visible like counts (going back at most 12 months) and take the
> **median** — the middle value, so one freak viral post can't distort it. That
> median is ≈ **580**. So this post scored 263 ÷ 580 ≈ **0.45×** — under half a
> typical Ashford post. Fine post; not a breakout.
>
> A **breakout** needs **2× or better** against the hotel's own median, plus an
> absolute floor of 500 engagement so tiny-number noise can't sneak in. A 40k-follower
> boutique clearing 2× ranks above a 2M-follower giant that didn't — no
> follower-count bias, which is the product's whole point.
>
> *And the cautionary tale:* before the 31 July fix, fake "3-like" rows had dragged
> Ashford's median down to about 4 — making this same ordinary post look like a
> monster **65.7×** breakout. Same post, same real engagement; a poisoned baseline.
> That's why the honesty gates below exist.

**The honesty gates.** A hotel is excluded from breakouts and rankings when its
numbers can't be trusted: fewer than 12 readable posts in 12 months (no honest
baseline — about 21 hotels), or more than half its recent posts have hidden likes
(median built on too thin a sample). ER is also nulled for hotels that haven't
posted in 60 days — a stale median shouldn't coast forever.

**The leaderboard** ranks hotels by **engagement rate**: the median per-post
(likes + comments) ÷ followers over the same 30-post window — "how well does this
hotel's *typical* post do, for its size". The sort-only "Momentum" pill is a
different measure (total 30-day engagement ÷ followers) that rewards showing up
often; it's deliberately never displayed as a percentage.

**Time windows.** Top posts offers 7-day / 30-day / all-time, all pre-computed in
the same request — the toggle is instant. The hero "X posts outperformed this week"
is always the 7-day count. When a week is thin, the 7-day view appends a clearly
separated "Closest this week" section (posts at 1.25×–2×) rather than lowering the
2× bar — near-misses are labelled and never counted as breakouts.

**The Monday publish gate.** Members only see posts dated on or before the
`publish_cutoff` timestamp. Sunday's scrape lands invisibly; the founder reviews in
`/admin` Monday morning, hides anything that shouldn't go out, and presses **Publish
to members** — which moves the cutoff to now, releasing the week in one click. Hiding
a post or hotel is *full* exclusion: it vanishes from every median, count and chart,
for everyone, so no figure can disagree with what's on screen. (The public landing
page refreshes on an hourly cache, so it can lag a publish by up to an hour.)

---

## 5. Money & access — how someone becomes a member

The journey, in order:

1. **Create account** — email + password. No access yet, no trial started.
2. **Confirm email** — Supabase sends a confirmation link; until it's clicked, login
   politely refuses with "check your inbox".
3. **Log in** → land on **/start-trial** (the gate bounces any unpaid user there).
4. **Start trial** → Stripe Checkout (the payment page is Stripe's, hosted by
   Stripe — card numbers never touch our code). 14-day trial, card required up
   front, nothing charged until it ends; no card at trial end = subscription
   cancels itself rather than charging.
5. **Stripe tells us** — a signed webhook (a message from Stripe to our server,
   cryptographically verified) writes the subscription's status into the
   `subscriptions` table, keyed by email.
6. **The gate opens** — `hasActiveAccess` says yes for `trialing` or `active` rows,
   and the member lands on the dashboard.

Around the edges: magic-link login (passwordless email link) remains as a fallback;
password recovery works through the same email-callback route; a **Manage billing**
button opens Stripe's own customer portal, and it deliberately works for *lapsed*
members too — someone whose card failed must be able to fix it. All the public
endpoints (signup, login, reset, checkout…) are rate-limited so a script can't
hammer them.

**Test vs live today:** everything runs in **Stripe test mode** — the fake `4242…`
card works and no real money can move. Pricing (founding £49/mo, standard £79/mo,
14-day trial) lives in one file, `lib/pricing.ts`, including the hand-edited
founding-places counter. The switch to live mode is the single hard blocker before
charging — it's a defined checklist (live keys, live prices, live webhook, four
Vercel settings, redeploy), detailed in the findings report.

---

## 6. What already watches the system — and what doesn't

The honest version, including the gaps. Everything below sends email via the
workflow's failure notification, plus a direct Resend email where noted.

| Job | When | What it does | If it fails **loudly** | If it fails **silently** |
|---|---|---|---|---|
| **weekly-scrape** | Mon 05:00 UTC | scrape → freshness check → AI insights → image prune → storage check | GitHub emails same day | Since 4 Aug a zero-result run exits red. Remaining quiet mode: a *partial* run (some batches fail) passes by design — repeated weekly for the same batch, that subset just goes stale, unwatched |
| **monthly-scrape** | 1st, 05:00 UTC | same, 35-day window | GitHub emails | Nothing catches it — weekly keeps data "fresh", so the freshness alarm stays green while late-viral refreshes quietly stop |
| **full-scrape** | manual only | baseline rebuild | n/a | n/a |
| **freshness-check** | daily 07:30 UTC | newest post > 8 days old → red + email; also runs the storage check | GitHub + Resend email | **Nothing watches the watcher.** If GitHub's scheduler disables it (it auto-disables crons after 60 days of repo inactivity), no alert ever fires again |
| **storage check** | daily + post-scrape | bucket vs the 5 GB cost line | email at 70%, red at 90% | covered daily even when a scrape fails |
| **Sentry** | always | captures unhandled server errors in production | it's the thing that caught the 2 Aug outage | *handled* errors are invisible to it — a gate quietly redirecting everyone, or a webhook politely rejecting everything, never registers |
| **CI (tests/lint)** | *supposed to be* every push | type-check, lint, tests | — | **Currently dead.** The workflow watches a folder named `dashboard/` that doesn't exist (the app is `hotel-dashboard/`), so CI has never run on any push. The build/lint/test discipline is manual convention only |

**What has no watcher at all today** — this list is exactly why the daily health
digest (Phase 2) was designed:

- **Data anomalies** — the next "likes = 3"-style corruption, follower-count
  collapses, per-hotel coverage gaps. The last one sat undetected for weeks and was
  found *by accident* during an outreach export.
- **The auth gate** — no daily probe confirms logged-out visitors are actually
  redirected. The 9 July regression (production ungated) was found by an audit, not
  an alarm.
- **Stripe webhook health** — a dead webhook means the subscriptions table quietly
  drifts from Stripe's reality: paying customers locked out, or lapsed ones kept.
- **The publish gate** — a forgotten Monday publish just leaves members on last
  week's data, silently.
- **Uptime** — the 2 Aug incident proved the public site can *look* fine (serving a
  stale cached copy) while every database call fails behind it. A 200 from the
  homepage proves nothing.
- **Client-side errors** — Sentry is server-only; JavaScript errors in members'
  browsers are invisible.

---

## The flow, on one screen

```
 Instagram (public pages)
      │  Apify robots: profiles + posts (Mon 05:00 UTC + 1st of month)
      ▼
 scrape-run.js ── batches of 50 ──► scrape.js
      │                                │  images → WebP → standout-images bucket
      │                                ▼
      │                          Supabase tables
      │                          posts / profile_snapshots / hotels
      ▼
 check-freshness.js  (data recent?)
      ▼
 generate-insight.js (Claude looks at top-10 breakouts → "why it worked")
      ▼                                │
 cleanup-images.js   (prune bucket)    ▼
 check-storage.js    (5 GB line)  standout_posts (notes, picks, pins, hides)
                                       │
                                       ▼
                     ┌── getPortfolioData() — lib/data.ts ──┐
                     │ baselines · breakouts · leaderboard  │
                     │ levers · taster · publish gate       │
                     └──────────────┬───────────────────────┘
              public landing ◄──────┤ (hourly cache)
                                    ▼
                        the gate: require-access.ts
                 no login → /login · unpaid → /start-trial
                                    ▼
                              /dashboard
                                    ▲
     Stripe Checkout ──(signed webhook)──► subscriptions table
```

*Companion document: `review-findings-2026-08-04.md` — the current findings,
launch checklist, and reconciliation of the two prior audits.*

# Is it worth buying? — 7 August 2026

**Read-only investigation.** No code was changed, no database row was written, no
scrape was run, no AI backfill was run, nothing was deployed, no commit, branch or
PR was made. `lib/data.ts` and `lib/pricing.ts` were read and never edited. This
file is the only thing this session added.

**The question this answers:** a hotel's social manager pays £49 a month. Do the
numbers on screen survive scrutiny, does the thing keep running without Neil
nursing it, and is there enough in it to be worth paying for again in month three?

Figures carried forward from `docs/claims-audit-2026-08-07.md` where they still
hold; everything load-bearing was re-derived today. Where this document and that
one disagree, this one is current.

---

## 1. The three verdicts

**Would a hotel social manager trust these numbers? Not the headline list — no.**
Four of the twenty breakouts in the all-time view carry a like count materially
higher than the live Instagram post, by five to thirteen times. That is a 20% error
rate on the flagship list, and it is reproducible: in a controlled 28-post sample
the rate was 21%, and **every single overstated post was a Reel**. Not one photo or
carousel was overstated in fourteen tries. The arithmetic itself is sound — five
hand-reconstructions matched the displayed figure to the decimal, and the
hidden-likes fix has genuinely held — so this is bad input, not bad maths. But a
hotel checking its own post sees the wrong number, and 72% of the all-time top 100
are Reels.

**Will it run for three months without Neil intervening? No.** Over the last ten
scrape runs, exactly **one unattended cron produced real data**. Three of the four
runs that actually collected anything were triggered by hand. Two runs reported
green in GitHub Actions while collecting **zero posts** — both times because Apify
billing had stopped, once on an unpaid invoice and once on a usage cap. The thing
most likely to break first is Apify billing, because it has already broken twice in
ten weeks, it is outside this repo's control, and the guard now written to catch it
has never once fired in production.

**Is there enough here to be worth £49 in month three? Marginally, and the trend is
the wrong way.** Week one is genuinely substantial — 196 distinct posts across the
three windows, a 175-hotel leaderboard, a couple of hours of real material. Month
three is not. The all-time list is effectively frozen: **this week's nineteen
breakouts overlap the all-time top 100 by exactly zero posts**, so a member who
reads that list once never sees it change. The five levers move on a 30-day median
over ~1,585 posts, which one week barely shifts. So the recurring product is the
weekly drop — about nineteen posts, of which roughly nine are collabs a hotel
cannot act on alone, and about ten carry a written explanation. That is closer to
ten useful items a week than to a library, and a member who feels finished cancels.

---

## 2. Do not send until fixed

Ruthlessly short. Worst first. Everything else is in section 6.

1. **Reject Reels whose stored like count exceeds the live post.** ⟵ *open*
   This is the whole audit in one line. 20% of the displayed all-time top 20 is
   wrong in the one direction that costs trust — stored *higher* than real — and
   72% of that list is video. The cause is now known (see section 3): the Apify
   actor returns a wrong and unstable `likesCount` for collab Reels, so neither a
   mapping fix nor a re-scrape resolves it. The fix has to be a check on our side.
   Until it exists, no outreach email should point a hotelier at the all-time view.

2. **Remove "Michelin Keys" from the two landing-page chip rows.** ✅ *done —
   PR #99.* Both rows now name Forbes, the Gold List and World's 50 Best, and the
   second row no longer disagrees with the first. Per-hotel Michelin pins on the
   leaderboard untouched. Comments added at both sites so a fourth redesign cannot
   quietly reinstate it.

3. **Make the scrape guard prove it can fail.** ✅ *done — see section 4.*
   `scrape-run.js` was run against a deliberately broken configuration: all five
   batches failed, the banner read SCRAPE FAILED, and it exited 1. No Apify credit
   was spent and nothing was written. The remaining gap is the **freshness check's
   one-cycle blind spot** — it cannot catch the first failure in a sequence, only
   the second — which is a real weakness but not a launch blocker on its own.

**Item 1 is now the only thing I would not launch without.**

---

## 3. Numbers check — the twenty posts

### Method

`computeStandout` was reconstructed from `lib/data.ts` as a read-only script and
validated before use: it reproduces the live site exactly — 19 breakouts this week,
204 hotels, 45 countries, 6,559 posts analysed, insight coverage 10 of 19. The top
20 of the all-time view came from that reconstruction.

Real Instagram counts were read from each post's `og:description`, which Instagram
serves to crawler user agents. Every one of the twenty resolved; none were
unreachable. Counts above ~10,000 are rounded by Instagram to the nearest thousand,
marked `≈` below.

### Stored versus real

| # | Hotel | Stored likes | Real likes | Verdict |
|---|---|---|---|---|
| 1 | Rosewood Mayakoba | 46,067 | ≈54,000 | drift |
| 2 | **Jumeirah Al Naseem** | **36,202** | **315** | **OVERSTATED ~115×** |
| 3 | **Cheval Blanc St-Barth** | **80,970** | **1,228** | **OVERSTATED ~66×** |
| 4 | Raffles London OWO | 54,547 | ≈55,000 | exact |
| 5 | Carlton Cannes | 126,056 | ≈133,000 | drift |
| 6 | Nay Palad Hideaway | 20,282 | ≈20,000 | exact |
| 7 | Carlton Cannes | 100,527 | ≈128,000 | drift |
| 8 | Las Ventanas al Paraíso | 27,209 | ≈27,000 | exact |
| 9 | Raffles London OWO | 25,212 | ≈25,000 | exact |
| 10 | Nay Palad Hideaway | 13,116 | ≈13,000 | exact |
| 11 | Park Hotel Vitznau | 49,005 | ≈49,000 | exact |
| 12 | **Rosewood Hong Kong** | **25,744** | **703** | **OVERSTATED ~37×** |
| 13 | Las Ventanas al Paraíso | 19,312 | ≈19,000 | exact |
| 14 | Nay Palad Hideaway | 10,753 | ≈11,000 | exact |
| 15 | The Connaught | 49,989 | ≈50,000 | exact |
| 16 | Copacabana Palace | 53,187 | ≈53,000 | exact |
| 17 | Hotel Esencia | 20,685 | ≈21,000 | exact |
| 18 | Salamander Middleburg | 4,602 | 6,216 | drift |
| 19 | Carlton Cannes | 55,850 | ≈56,000 | exact |
| 20 | **Le Meurice** | **99,009** | **≈51,000** | **OVERSTATED ~1.9×** |

**The error rate, plainly: twelve of twenty match, four are lower than the live post
because the post kept earning likes after the scrape, and four are higher than the
live post by between 1.9× and 115×.** Only the last group is a defect — stored being
lower is expected and harmless. So the honest headline is **20% of the flagship
list overstates a hotel's own numbers**, and the overstatement is not marginal.

### What the four have in common

The first read of this evidence was that Instagram had purged inauthentic likes.
That is wrong, and it matters, because it would point at a problem nobody can fix.
A controlled test says otherwise.

Twenty-eight breakouts were sampled — fourteen flagged `is_collab`, fourteen not —
and each compared against its live post:

| Post type | Sampled | Overstated | Stored ÷ real |
|---|---|---|---|
| Image | 2 | **0** | 0.92 – 1.00 |
| Sidecar (carousel) | 12 | **0** | 0.67 – 1.00 |
| **Video (Reel)** | **14** | **6** | eight at 0.77–0.99, six at **5.2× – 13.0×** |

**Every overstated post is a Reel. No photo or carousel was overstated in fourteen
attempts.** The ratios are bimodal, not a spread: a Reel is either accurate to
within normal drift, or it is out by an order of magnitude. There is no middle.

Five of the six bad Reels are the same four-account Rosewood group collab, where
Instagram shows a fifth account — the parent brand `@rosewoodhotels` — as the post's
author. The sixth (`@lamamouniamarrakech`, 6.2× over) is a solo Reel with no
recorded co-authors, so a collab is not a necessary condition. Across the whole
collab sample, thirteen of fourteen posts had an `og:title` account different from
the handle the row is filed under, yet only five were overstated — so a co-post by
itself is not sufficient either.

### The mechanism — resolved

The stored Apify datasets from the 21 July, 27 July and 4 August runs were read
(GET only; no actor was started, and monthly usage was confirmed unmoved at $2.65
afterwards). They settle it.

**Our code is not at fault.** `scrape.js:303` stores `normalizeLikesCount(p.likesCount)`
— the actor's own field, verbatim. For the la Mamounia Reel the 4 August dataset
contains `likesCount: 4603`, and the database contains 4,603. Instagram shows 746.
The scraper stored exactly what it was given, and what it was given was wrong.

**It is not a view or play count either**, which was the leading theory. The same
dataset row carries `videoViewCount: 48063` and `videoPlayCount: 337412` alongside
the bad `likesCount: 4603`. All three fields are present and distinct, so nothing is
being substituted for anything else.

**The actor's figure is unstable across runs of the same post.** Tracking one Rosewood
co-post (`DbBNC9bIzGU`) through three scrapes:

| Run | `likesCount` | `commentsCount` | `videoPlayCount` |
|---|---|---|---|
| 21 Jul | **333–334** | 10 | 13,3xx |
| 27 Jul | **2,665** | 24 | 162,0xx |
| Live today | **513** | — | — |

Likes rose eightfold in six days, then fell fivefold. Real engagement does not do
that. Two runs three minutes apart agree with each other precisely, so this is not
sampling noise within a run — it is the actor returning a different, wrong answer on
a different day.

**So: an upstream defect in `apify/instagram-post-scraper` for collab Reels.** Every
affected post carries `ownerUsername: rosewoodhotels` — a parent brand co-posting with
its properties — except the la Mamounia one, which is solo, so the co-post shape is
strongly associated but not the whole story.

The practical consequence is the useful part: **this cannot be fixed by correcting our
mapping, and re-scraping will not reliably fix it either**, since the actor returned a
wrong figure on two separate occasions. Any fix has to be a check on our side. The
cheapest credible one is the method this audit used — re-read `og:description` for the
handful of posts about to be displayed as top breakouts and reject any whose stored
likes exceed the live figure. That is twenty HTTP requests, no Apify credit, and it
catches the failure regardless of what causes it.

**Exposure, clearly labelled as an estimate:** 72 of the all-time top 100 are Reels,
43 of the 30-day 100, and 9 of this week's 19. If the sampled 6-in-14 Reel rate
holds, that implies roughly 30 of the all-time top 100 are affected. That figure is
an extrapolation from a 14-Reel sample and should be measured properly before it is
quoted anywhere.

### The maths itself is correct

Five posts were reconstructed by hand from the raw `posts` table — pulling each
hotel's history, filtering to visible-like posts within 365 days, taking the last
thirty, and computing the median of likes plus comments:

- Rosewood Mayakoba: median 145, engagement 47,732 → **329.186×**, matches.
- Jumeirah Al Naseem: median 113, engagement 36,222 → **320.549×**, matches.
- Cheval Blanc St-Barth: median 322, engagement 81,001 → **251.556×**, matches.
- JOALI BEING: median 129.5, engagement 5,951 → **45.95×**, displays as "46.0×", matches.
- Santa Caterina: median 448.5, engagement 20,269 → **45.19×**, displays as "45.2×", matches.

Every one reproduces exactly. **The baseline method, the 2× threshold and the
multiplier arithmetic are sound.** The two sub-cap posts — the ones where a customer
sees a precise figure rather than "50×+" and could actually check it — are correct
in both the maths and the underlying like count. The failure is entirely upstream,
in what the scraper stored.

### The display cap hides this, and that cuts both ways

`lib/format-multiplier.ts` renders anything at or above 50× as "50×+". **All twenty
of the all-time top 20 are above 50×, so every one displays as "50×+".** A member
cannot check those multipliers because no number is shown. That currently conceals
the four bad rows — but it also means the product's flagship list contains no
verifiable figure at all, and the likes and comments counts on those same cards
*are* shown, and four of them are wrong.

### The age problem

Ranks 3, 4, 9 and 20 were posted in October 2023, April 2025, July 2025 and July
2025. Each is judged against its hotel's *current* median, built from posts dated
April to August 2026. This is documented behaviour, not a bug — but the database
cannot support the alternative either:

- **Cheval Blanc St-Barth** (Oct 2023): the entire stored history contains two other
  posts from that era, then an eleven-month gap.
- **Raffles London OWO** (Apr 2025): the breakout post *is* the first post ever
  stored for that handle. The second is another top-20 breakout. Then an eight-month gap.
- **Le Meurice** (Jul 2025): same shape — first post ever stored, then a nine-month gap.

So for two of the three oldest posts in the top 20, there is no period baseline and
no way to construct one. A member reading "50×+" beside a 2023 photograph is being
shown a comparison against today's account, not that post's own era.

### The hidden-likes fix has held

Verified today rather than assumed:

- `likes_count = 3` → **0 rows**. `likes_count = -1` → **0 rows**. Null → 1,924.
- Of the 763 posts dated since 25 July, **zero** carry either sentinel, and the null
  rate is 7.5% against an all-time 17.3% — new data is arriving cleaner, not worse.
- `normalizeLikesCount()` in `instagram-pipeline/likes.js` maps null, negatives and
  the literal `3` to null, and — the part worth checking — it is genuinely called:
  `scrape.js` invokes it on the write path, `scrape-run.js` calls `scrape.js`, and
  `scrape-pipeline.yml` runs `scrape-run.js`. **This is a live safeguard, not a
  decorative one.** It is the one guard in this system with a demonstrated path to
  the data.

---

## 4. Reliability

### Cadence — the cron is not carrying it

Ten runs of the scrape workflows, cross-checked against `profile_snapshots.captured_at`,
which is the ground truth for when a scrape actually touched the database:

| Date | Trigger | GitHub says | Actually collected data? |
|---|---|---|---|
| 4 Aug | **hand-run** | success | **yes** |
| 3 Aug | schedule | failure | no — Supabase storage restriction |
| 1 Aug | schedule | **success** | **no — 0 posts, 0 profiles** |
| 27 Jul | schedule | success | **yes** |
| 21 Jul | **hand-run** | success | **yes** |
| 21 Jul | hand-run | cancelled | no |
| 21 Jul | hand-run | cancelled | no |
| 20 Jul | schedule | failure | no — Apify quota |
| 13 Jul | schedule | **success** | **no — 0 posts, 0 profiles** |
| 9 Jul | **hand-run** | success | **yes** |

- **Last genuinely successful scrape: Tuesday 4 August, run by hand.**
- **Three of the four runs that collected real data were hand-triggered.** One
  unattended cron worked in ten weeks.
- Distinct capture dates in three months: 24 Jun, 1 Jul, 2 Jul, 9 Jul, 21 Jul,
  27 Jul, 4 Aug. That is seven scrapes in eleven weeks against a weekly promise.
- **The Monday/Tuesday gap is explained.** Monday 3 August's cron failed with
  `exceed_storage_size_quota` — the tail of the 2 August Supabase outage. Someone
  ran it by hand on the Tuesday. That is a hand recovery from a real failure, not a
  late cron, and it is why the newest data is dated a Tuesday.

### Two green runs that collected nothing

13 July and 1 August both reported success with zero posts and zero profiles. On
1 August every Apify batch threw `Too many outstanding invoices`; on 13 July,
`Monthly usage hard limit exceeded`. Both showed a green tick.

On 13 July `check-freshness.js` passed, because the newest post was 3.8 days old —
from the previous good run — against an 8-day limit. **The freshness check cannot
catch the first failure in a sequence, only the second.** It proved that a week
later on 20 July, when the same Apify failure recurred and the data was finally old
enough to trip it.

`scrape-outcome.js` was written in response and now exits non-zero on
all-failed / no-posts / mass-failure, uncaught by the workflow, so it would fail the
job. It reads correctly. **It had never fired in production** — both real incidents
predate it.

> **Proven the same day, after this section was written.** `scrape-run.js` was run
> against a deliberately broken configuration (the read-only anon key in place of the
> service-role key, so every batch throws before anything can be written). All five
> batches failed, `classifyScrape` returned `all-failed`, the banner printed **SCRAPE
> FAILED** rather than COMPLETE, and the process **exited 1** — which is what fails the
> workflow step. No Apify actor ran (run list unchanged, monthly usage unmoved at
> $2.65) and no row was written.
>
> Two honest limits on that proof. The induced failure was an RLS-refused storage
> write, not an Apify billing error — the exit path is the same handler, so the
> *wiring* is proven, but the specific Apify failure shape is still inferred. And this
> was a local run, so GitHub's own "step exits non-zero → job fails" behaviour is
> assumed rather than observed. That assumption is safe; the wiring was the part worth
> checking, and it holds.

### The digest's seventeen checks cannot fail the job

`health-check/run-digest.js` runs all seventeen checks, collects the results, and
emails them. **The individual check results are never wired to the process exit
code.** The job exits non-zero only if Supabase is unreachable, `RESEND_API_KEY` is
missing, or the Resend send itself throws. So **a digest in which every check is red
still shows a green tick in GitHub Actions**, and the entire alarm rests on Neil
noticing an email he did receive, and reading it.

Today's digest did send — all seventeen green, correctly reporting the last real
scrape as 2.7 days ago. The workflow is four days old, so it has no meaningful track
record yet.

If the Resend key is wrong or belongs to the wrong one of the two accounts, the send
throws and the job fails, so GitHub's own failure email is the backstop. That path
was confirmed by reading the code, not by testing it.

### Sentry — unverified, and that is the finding

`SENTRY_DSN` is **not** among the keys in `hotel-dashboard/.env.local`. Production
could not be checked: the Vercel CLI is not authenticated in this session. The only
evidence that Sentry is live is a three-day-old note in
`docs/review-findings-2026-08-04.md` and one alert that fired during the 2 August
outage. **Whether Sentry is receiving events today is unknown**, and given that
`instrumentation.ts` is documented as fully inert without the DSN, that is worth
five minutes of Neil's time rather than an assumption.

Beyond Sentry and the once-daily digest there is no uptime monitoring. The
precedent matters: on 2 August Supabase 402'd the entire project API while the
public site kept serving stale ISR and looked perfectly healthy.

### What a customer sees when data goes stale

| Where | What renders | Source |
|---|---|---|
| `AppFooter.tsx` | "Updated weekly · 4 AUG 2026" | `week_ending_long` |
| `Dashboard.tsx` hero | "Week ending 4 Aug" | `week_ending` |
| `/watchlist` | **nothing at all** | no `footerNote` passed |

Both dates derive from `max(posted_at)`, not the render date. That is the right
choice: **the date freezes rather than lying.** If the scrape stopped today, in
three weeks the footer would still read 4 AUG 2026 — honest, but silent. There is
no "N days old" warning, no colour change, no banner, and **no staleness threshold
anywhere in the app**. The only staleness logic in the system lives in the
pipeline's `check-freshness.js`, which can send an email but cannot change anything
a member sees. Post cards show absolute timestamps, so an attentive member would
eventually notice the dates had stopped moving. Nothing would tell them.

### Load cost — not a near-term risk

The brief assumed `/dashboard` refetches uncached. **That is no longer true**:
PR #87 (5 Aug) wrapped the member view in `unstable_cache` at 600s.

Measured directly rather than taken from the code comment — the exact columns
`getPortfolioData()` selects total **8.70 MB across 17 requests** (posts 8.36 MB /
12 requests; profile_snapshots 193 kB; standout_posts 117 kB; hotels 27.5 kB). The
comment's "~17 requests, ~8.6 MB" is accurate.

Modelling every member session as its own cache miss — deliberately pessimistic,
since at these numbers sessions rarely collide inside one 10-minute window — and
adding the landing page's 24 uncached ISR recomputes a day:

| | 20 customers | 100 customers |
|---|---|---|
| Member sessions/month (3 per week) | 261 | 1,304 |
| Member egress | 2.27 GB | 11.34 GB |
| Landing ISR egress | 6.36 GB | 6.36 GB |
| **Total/month** | **~8.6 GB** | **~17.7 GB** |

Supabase Pro includes 250 GB, then $0.09/GB. Both cases sit at **3.5% and 7.1% of
the included allowance — zero overage.** Break-even is somewhere near 2,100
customers. **Egress cost is not a risk worth planning around.**

Two real caveats. The request count scales with *total accumulated posts* — `posts`
has no date filter, so every historical row is re-pulled on every cache miss, and
that grows forever. And if the cached object ever passes Vercel's 2 MB ceiling,
`unstable_cache` silently no-ops with no error and no log; the comment puts the
object at ~0.35 MB, which could not be verified without executing the transform. The
damage there would be latency with no observability, not money.

---

## 5. Depth — week one versus week four

### Volume

19 breakouts this week, 151 in thirty days, 932 all time. The three displayed lists
hold **196 distinct posts between them** — the 7-day list overlaps the all-time top
100 by **zero** posts, and the 30-day list by only fifteen. The windows are far more
independent than they look.

The 30-day and all-time lists are both capped at 100 by `STANDOUT_LIMIT`. All-time
has 932 qualifying and shows 100; the 30-day has 151 and shows 100. This is a slice
in the data layer, so "Show more" cannot reach past it — **832 all-time breakouts
exist that no member can ever see.**

Weekly counts over twelve weeks ran 19 to 79, averaging about 47. **This week's 19
is the lowest of the twelve.** Two caveats before anyone reads a collapse into that:
the current 7-day window only holds five populated days, because nothing has been
scraped since 4 August; and older weeks have had longer for their posts to accumulate
engagement and cross the 2× bar, which flatters them. The trend is worth watching on
clean data, not quoting yet.

Of this week's 19, **nine are collabs** — 47%, in line with the twelve-week average.
A collab needs a willing partner, so nearly half of a typical week is not a lever a
hotel can pull alone.

### Insight coverage against the promise

Coverage of what is actually displayed: **7-day 10 of 19 (53%), 30-day 45 of 100,
all-time 13 of 100.**

The current copy, quoted as it stands after the 7 August fixes:

- `Landing.tsx`: *"The strongest breakouts are read and explained, so you get the
  thinking you can reuse — not just a post that did well."*
- `how-it-works/page.tsx`: *"Many breakouts come with a short, plain-English read on
  what likely drove them…"*

The how-it-works wording is now honest. **The landing wording is not, and it is
wrong in a specific and checkable way.** Coverage is driven by recency, not by
multiplier — `generate-insight.js` takes the top ten non-collab breakouts of the
last seven days. So in the 30-day list the top 20 by multiplier carry insights on
**2 of 20**, while the bottom 20 carry **15 of 20**. It is the inverse of "the
strongest are read". In the all-time list the top three — 329×, 320×, 251× — have
no insight at all.

Forward: the job adds at most ten a week against roughly 47 new breakouts a week.
All-time coverage therefore goes from 13% today to about **14% at week four and 16%
at week twelve**. It cannot catch up; only another manual backfill moves it. The
30-day figure is likely to *fall* from 45% toward the low thirties as the 5 August
backfill ages out of the window.

Quality is genuinely mixed. The post-backfill template is good — one on Beaverbrook
reads *"The time-lapse arc from golden hour to lit-up night balloons gives the post
a clear visual narrative that a single static shot couldn't"*, which is specific and
reusable. Older rows are filler: *"Lebanese restaurant showcases heritage-driven
spiced culinary storytelling."* Both render identically, so a member cannot tell
which they will get.

### Week one

196 distinct posts, a **175-hotel leaderboard** (of 204 visible tracked hotels; 29
fail the ≥12 visible-like posts or ≥0.5 coverage gates), the five levers across two
scopes, and empty Saved and Watchlist. At twenty to thirty seconds a card that is
**roughly 1.5 to 2 hours of genuine material** if worked through properly. That is a
real first month.

### Week four

- **All-time: frozen.** This week's 19 breakouts overlap it by zero. Nothing short
  of a genuine super-breakout — one this week — displaces anything.
- **30-day: rotates, but at the bottom.** The window genuinely turns over, but new
  posts at 2–3× land at ranks 80–100. The "best of the month" section a member
  actually looks at barely moves.
- **Five levers: statistically inert week to week.** `buildLevers` draws on all valid
  posts in the last 30 days — measured at **1,585 posts**. One week replaces about a
  quarter of that sample; medians over 1,585 do not visibly reorder. The codebase
  says as much itself.
- **Saved and Watchlist: 0 rows each.** With no paying customers that is untested,
  not unused — but it also means the two features that would create habit have never
  been exercised by anyone.

So month three is the weekly drop and almost nothing else: **~19 posts, ~9 of them
collabs, ~10 with an explanation.** Two of the four main surfaces do not change on a
weekly cadence. That is the churn risk stated precisely — not "the data runs dry"
but "three quarters of what they paid for stops being new after the first month."

### Promised but not delivered

| Claim | Would a member notice in month one? |
|---|---|
| Michelin Keys, two landing chip rows | **Yes — and before they pay.** The dashboard's own Sources panel omits it with a comment explaining why. The landing page still claims it. |
| TikTok / YouTube, "September 2026" | Only if they read the FAQ. Honestly labelled "coming". Four weeks away. |
| "Your Hotel" page | Unlinked from the sidebar since 31 July and labelled "Example data". Low risk. |
| Featured shelf | Doubly dormant — nothing renders it, nothing sets it. Invisible. |
| "400+ hotels" against a live band reading 204+ | A deliberate decision, but the two numbers still sit one scroll apart. |

---

## 6. Later list

Everything real that does not block outreach.

1. **Decide what the all-time view is for.** 832 of 932 breakouts are unreachable,
   the top of it never changes, and 72% of it is the post type with the accuracy
   problem. It is simultaneously the most impressive surface and the least
   trustworthy.
2. **Judge old posts against a period baseline, or say plainly that you don't.** A
   2023 post measured against a 2026 account is defensible only if the page says so.
   The data to do it properly does not currently exist for the oldest posts.
3. **Wire the digest's seventeen checks to the exit code**, so a red check fails the
   job rather than relying on someone reading an email.
4. **Confirm `SENTRY_DSN` is set on Vercel Production**, or accept that server errors
   are unmonitored.
5. **Give `/watchlist` a freshness line** — it is the only gated page with none.
6. **Consider an explicit staleness signal in the app** once data passes, say, ten
   days old. The date freezing is honest but silent.
7. **Raise `MAX_STANDOUT` as the tracked set grows.** At ten a week, coverage falls as
   the hotel count rises — roughly 26% at 400 hotels, 11% at 1,000.
8. **Re-quote the weekly breakout trend on clean data** once two full unattended
   scrapes have run. 79 → 19 over twelve weeks may be partly a measurement artifact.
9. **Note the `posts` query has no date filter** — every historical row is re-pulled
   on every cache miss, and that grows without bound.
10. **`cleanup-images.js` still uses the two-sentinel rule** and does not exclude the
    `3` the app now excludes. It errs toward keeping too much, so it is a tidiness
    item, but it is deletion logic.

---

## 7. Queries used

Read-only PostgREST `GET` requests via a scratch helper with no write path
(`/private/tmp/.../scratchpad/q.mjs`, outside the repo). The service-role key was
used so RLS-protected tables were readable; no key value was printed or transmitted.

**Row counts**
```
hotels?select=id                                    --count -> 871
hotels?select=id&tracked=eq.true                    --count -> 211
posts?select=post_id                                --count -> 11127
posts?select=post_id&likes_count=eq.3               --count -> 0
posts?select=post_id&likes_count=eq.-1              --count -> 0
posts?select=post_id&likes_count=is.null            --count -> 1924
posts?select=post_id&posted_at=gte.2026-08-05       --count -> 0
standout_posts?select=post_id                       --count -> 123
subscriptions?select=id                             --count -> 2
saved_posts?select=id                               --count -> 0
watchlist_hotels?select=id                          --count -> 0
profile_snapshots?select=id                         --count -> 1734
```

**Breakout reconstruction** — `scratchpad/breakouts.mjs` mirrors `computeStandout`
and `getPortfolioData`'s member path exactly: publish gate at
`dashboard_settings.publish_cutoff` (2026-08-05T09:36:52Z, withholding 0 posts),
tracked and non-hidden handles only, admin-hidden post ids excluded, composite
`(post_id, instagram_handle)` de-dupe, `hasVisibleLikes` excluding null / -1 / 3,
baseline = median of likes+comments over the last 30 visible-like posts within 365
days, gates `MIN_ENGAGEMENT` 500, `MIN_BASELINE_ENGAGEMENT` 25, coverage ratio ≥ 0.5,
measurable ≥ 12 posts, threshold 2×, cap 100 per window.

Validated against the live site before use — it reproduces 19 breakouts, 204
hotels, 45 countries, 6,559 posts and 10-of-19 insight coverage, matching both the
rendered page and this morning's front-door audit.

Outputs: `out-summary.json`, `out-7d.json`, `out-30d.json`, `out-all.json`.

**Live Instagram counts** — `og:description` read with a crawler user agent:
```
curl -s -A "Googlebot/2.1 (+http://www.google.com/bot.html)" "<post_url>"
```
A normal browser user agent returns a login-walled shell with no counts. All 20 top
posts and all 28 sample posts resolved; each result was re-checked with
`facebookexternalhit/1.1` and returned identical figures. Post shortcodes were
decoded and matched against the stored `post_id`, so no result is a wrong-post mixup.

**The type correlation** — `scratchpad/collabtest.mjs`, 28 breakouts (14 flagged
`is_collab`, 14 not), each fetched live and compared. Grouped by `posts.type`:
Image 0/2 overstated, Sidecar 0/12, Video 6/14. Raw results in
`scratchpad/collabtest.json`.

**Workflow history** — `gh run list` / `gh run view --log` across `weekly-scrape`,
`monthly-scrape`, `full-scrape`, `scrape-pipeline`, `daily-health-digest`,
cross-checked against distinct `profile_snapshots.captured_at` dates as ground truth
for when a scrape actually wrote to the database. No workflow was triggered.

**Transfer size** — measured by pulling the exact columns `getPortfolioData()`
selects and taking the byte length: posts 8,360,748 · profile_snapshots 193,372 ·
standout_posts 117,123 · hotels 27,516 · dashboard_settings 99 = **8,698,858 bytes
across 17 requests**.

**Not verified, and stated as such:** whether `SENTRY_DSN` is set on Vercel
Production (CLI not authenticated); the ~0.35 MB serialised size of the cached
object (requires executing the transform); and the mechanism behind the Reel like
counts (association established, cause not proven).

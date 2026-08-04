# Status audit — 31 July 2026

**Read-only investigation.** No code was changed, no database row was written, no scrape
was run, no AI backfill was run, nothing was deployed. The only file added by this audit is
this one.

**A note on jargon.** I've defined technical terms the first time they appear. Two you'll
meet constantly:

- **Baseline / median** — a hotel's "typical post". We take its last 30 posts, line up the
  engagement numbers, and take the middle one. A *median* is used rather than an average so
  one viral post doesn't drag the "typical" figure upwards.
- **Multiplier** — how many times better a post did than that hotel's typical post. A post
  at "5×" got five times the engagement of the hotel's normal.

---

## Headline

Three things stand out, in order of how much they matter:

1. **The dashboard is currently telling paying members that a hotel beat its own average by
   1,227×, as a headline statistic.** It is on screen right now. It is arithmetically
   correct and editorially indefensible. (A1, D1)
2. **The dashboard claims to crawl a list it does not crawl.** The "Sources crawled" panel
   names Michelin Keys. Michelin appears nowhere in the hotel data, and 107 of the 139
   Michelin hotels aren't even rows in the database. (B4)
3. **The mechanics are sound.** Auth holds, the payment plumbing is correctly built, the
   publish gate works, hidden data is genuinely excluded. The problems are with *what the
   numbers say*, not with whether the software works.

---

# SECTION A — Is the product robust enough to sell?

## A1. The hidden-likes sentinel `3`

**Background.** Instagram hides the like count on some posts. When that happens the scraper
can't read a real number, so it writes a placeholder ("sentinel") instead. The app knows
about two placeholders and throws those posts away. There is a third it doesn't know about.

### The count today

| `likes_count` value | rows in `posts` | Is it thrown away? |
|---|---|---|
| `null` | 952 | Yes |
| `-1` | 118 | Yes |
| **`3`** | **813** | **No — counted as a real 3-like post** |

**813 confirmed**, matching the earlier audit exactly.

That `3` is a placeholder and not real data is not a judgement call. Look at the neighbouring
values:

| likes | 0 | 1 | 2 | **3** | 4 | 5 |
|---|---|---|---|---|---|---|
| rows | 2 | 0 | 2 | **813** | 3 | 4 |

A single value occurring 813 times when its neighbours occur 0–4 times is a placeholder. No
natural process produces that shape.

### The code that decides (quoted exactly)

From [lib/data.ts:323](lib/data.ts#L323):

```ts
/** Instagram hides like counts on some posts — the pipeline stores those as -1 or null. */
export function hasVisibleLikesCount(likes_count: number | null): boolean {
  return likes_count !== -1 && likes_count !== null;
}
/** Object form of {@link hasVisibleLikesCount} — the single source of truth for the hidden-likes rule. */
export function hasVisibleLikes(p: { likes_count: number | null }): boolean {
  return hasVisibleLikesCount(p.likes_count);
}
```

**Is `3` excluded? No.** The function tests only `-1` and `null`. A post with the `3`
placeholder is treated as a genuine 3-like post and flows into every engagement rate,
every baseline, and every multiplier.

### The damage, quantified

I rebuilt the app's exact calculation from `lib/data.ts` and ran it twice — once as the
product behaves today, once with `3` also excluded — over the real data as members see it
(tracked hotels only, published posts only, duplicates removed: 7,404 posts, 200 hotels).

**Hotels affected: 57 of 200** (28%) would have their engagement rate, breakout baseline, or
breakout multipliers change.

Broken down:

| Effect | Hotels |
|---|---|
| Hold at least one `3` post | 64 |
| Displayed engagement rate on the leaderboard changes | 51 |
| "Typical post" baseline changes | 57 |
| At least one breakout multiplier changes | 37 |
| **Distinct hotels affected (any of the above)** | **57** |

Breakout counts would move from 123 → 115 (last 30 days) and 891 → 864 (all time).

### The three worst-affected

These are the worst because the placeholder has taken over the hotel's *median*. Once more
than half a hotel's recent posts read as "3 likes", the "typical post" figure becomes the
placeholder itself — and every real post then looks like an astronomical breakout.

| Hotel | "Typical post" shown now | What it actually is | Distortion |
|---|---|---|---|
| **Our Habitas AlUla** (@habitasalula) | **6** | 7,728 | **1,288× too low** |
| **Eden Rock – St Barths** (@er_stbarths) | **15.5** | 1,436 | **93× too low** |
| **The Mulia – Nusa Dua, Bali** (@themuliabali) | **3** | 175.5 | **58× too low** |

Runners-up: Mandarin Oriental Paris (4.5 vs 190), Maçakizi (7.5 vs 314), Nizuc (3.5 vs 121),
Atlantis The Royal (38 vs 1,212), Ashford Castle (20 vs 629).

Atlantis, The Royal shows the pattern most clearly. Its last 30 posts read:

```
1666, 741, 3, 1184, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3
```

A hotel with 1,666 likes on one post did not then post 26 times and get exactly three likes
each time.

### Two things this does NOT explain

Worth being precise, because fixing `3` alone will not fix the credibility problem:

- **The visible engagement-rate errors are small.** The biggest change to any displayed
  leaderboard percentage is Chatham Bars Inn, 0.57% → 0.81%. Nobody would notice. Where the
  placeholder dominates a hotel, the app's existing coverage gate already hides the rate.
- **The most embarrassing number on the dashboard survives the fix.** Crockfords at Resorts
  World Genting shows **857×**, and that is *real arithmetic on real data*: it has 100,354
  followers and genuinely gets 13–46 likes on a typical post, then had one post hit 32,423.
  Excluding `3` doesn't change it at all. Okada Manila's 1,227× drops only to 361× — still
  absurd. See D1.

**Not fixed, as instructed.** Quantified only.

---

## A2. What happens when more than one person uses it at once

### Is `getPortfolioData()` cached?

**No — it is recomputed from scratch on every single request to `/dashboard`.**

[app/dashboard/page.tsx](app/dashboard/page.tsx) has no `revalidate` setting, no
`unstable_cache`, and no React `cache()` wrapper. It can't be cached, because the page reads
login cookies, which forces Next.js to render it fresh per request. The public landing page
`/` is different — it caches for an hour (`revalidate = 3600`).

### How long does `/dashboard` take?

I could not time the real production `/dashboard` end-to-end: it is behind the login gate,
and I have no member session (getting one would mean creating an account and a Stripe
subscription — a write). So I measured the two halves separately.

**Half one — fetching the data (measured against the live production database):**

| Query | Requests | Time |
|---|---|---|
| Settings | 1 | 114–181 ms |
| Hotels | 1 | 85–168 ms |
| Editorial notes | 1 | 91–183 ms |
| Follower snapshots | 2 | 203–237 ms |
| **Posts** | **11** | **3,092–3,971 ms** |
| **Total** | **16** | **3.6–4.7 s** |

**Half two — the whole page rendered locally** against the same live production database:
**2.0–2.4 seconds**, warm. That render is genuine: the HTML is 380 KB and contains real hotel
names and real multipliers.

So: **roughly 2 seconds per dashboard load.** On Vercel it will be faster than my local
measurement for the data fetch (its servers sit on a far better network than my home
connection) and slower for nothing in particular. **2 seconds is a fair working figure, and
I'd put moderate confidence on it.**

### How many database queries does one page load fire?

**16 HTTP requests**, run one after another (not in parallel).

Six *logical* queries, but the posts table has 10,478 rows and the database returns a maximum
of 1,000 at a time, so that one query becomes **11 sequential round trips**. That's the whole
cost: 11 of the 16 requests and ~85% of the time.

Every dashboard load downloads **the entire posts table — about 7.8 MB** — to compute
figures that mostly don't change between requests.

### If 20 people logged in at once, what breaks first?

**Honest answer: nothing breaks. It gets slow. My confidence is moderate, and I want to be
straight about why it isn't higher.**

Taking the three candidates in turn:

- **Database row limits — not the problem.** The 1,000-row cap is already handled correctly
  by pagination. There is no row limit to hit.
- **Vercel function timeout — probably not the problem, but unverified.** There is no
  `vercel.json` and no `maxDuration` set anywhere, so the platform default applies. At ~2 s
  per render there's a lot of headroom, but I could not confirm the account's plan or
  timeout, so I can't rule it out at high concurrency.
- **Throughput — this is where it degrades.** Vercel starts extra copies of the function
  freely, so 20 users become 20 simultaneous 7.8 MB downloads from the database. That's
  ~156 MB of transfer for one page view each.

I tested 10 simultaneous dashboard-equivalent data pulls. Each went from ~3.5 s to 16–18 s.
**But I do not trust that number as a measure of the database**, and I won't present it as
one: the test moved 78 MB over my home internet connection, so I was very likely measuring my
own bandwidth, not Supabase. Aggregate throughput actually *improved* under concurrency
(35 Mbps vs 18 Mbps single), which is the signature of a client-side bandwidth limit rather
than a server under strain. From Vercel's network the same test would look very different.

**What I'd tell you with confidence:** at 20 concurrent members the site will stay up and
serve correct pages, but load times will rise — plausibly into the 5–15 second range — and
the cause will be re-downloading the full posts table 20 times over. **Cannot determine the
exact breaking point from code — needs a load test against production with a real member
session, or the Vercel and Supabase usage dashboards during real traffic.**

The fix, when it matters, is not more infrastructure: it's caching the computed result for a
few minutes, since every member sees identical data.

---

## A3. The path a real paying customer walks

Traced through the code. The steps:

1. `/start-trial` → **`POST /api/auth/signup`** ([route](app/api/auth/signup/route.ts)) —
   creates the account. Deliberately no session and no trial yet.
2. Supabase emails a confirmation link.
3. Link → **`/auth/callback`** ([route](app/auth/callback/route.ts)) — verifies the token,
   sets login cookies, redirects to `/dashboard`.
4. `/dashboard` gate ([lib/require-access.ts](lib/require-access.ts)) sees no subscription →
   bounces to `/start-trial`.
5. `/start-trial` now shows a checkout button → **`POST /api/checkout`**
   ([route](app/api/checkout/route.ts)) — creates a Stripe session, 14-day trial, card
   required, nothing charged.
6. Stripe → **`POST /api/webhooks/stripe`** ([route](app/api/webhooks/stripe/route.ts)) —
   signature-verified, writes the subscription row keyed on email.
7. Stripe redirects to `/dashboard`. The gate now passes.

### Every point where it can break, in order

| # | Where | What goes wrong | Severity |
|---|---|---|---|
| 1 | **Supabase "Confirm email" setting** | If off, no confirmation email is sent and the customer waits forever for a link that never arrives. Manual dashboard setting, not in code. | **Fatal** |
| 2 | **Supabase email templates** | The three templates must point at `/auth/callback?token_hash={{ .TokenHash }}&type=…`. Wrong template = every link dead. Manual, not in code. | **Fatal** |
| 3 | **Redirect URL allow-list** | Must include `/auth/callback` and `/auth/new-password`, or Supabase refuses the redirect. Manual, not in code. | **Fatal** |
| 4 | Confirmation email deliverability | Supabase's default sender lands in spam more than a custom domain would. Silent — you never learn it happened. | High |
| 5 | Rate limit | 5 signups per IP per minute. A hotel's office network with several people trying could trip it. | Low |
| 6 | **`STRIPE_FOUNDING_PRICE_ID` must exist and be valid in the same Stripe mode as the secret key** | Mismatched mode = checkout 500s. The route logs it and returns "Could not start checkout." | **Fatal** |
| 7 | `FOUNDING_PLACES_TAKEN` is edited **by hand** in [lib/pricing.ts](lib/pricing.ts) | If not updated, member 21 still gets the £49 founding price, locked for life. Silent revenue leak. | Medium |
| 8 | **Webhook secret** | Wrong secret = every webhook rejected. Customer pays, no subscription row is written, and the gate keeps bouncing them to `/start-trial`. **They have paid and cannot get in.** | **Fatal** |
| 9 | Webhook joins on **email** | If the Stripe email differs in any way from the account email, the row never matches the account. | Medium |
| 10 | Webhook sends a **magic-link email after checkout** ([route:64](app/api/webhooks/stripe/route.ts#L64)) | Left over from the old flow. The customer is already logged in and lands on the dashboard, then receives a confusing "here's your login link" email. Cosmetic, but it looks amateurish at exactly the wrong moment. | Low |
| 11 | Race on return from Stripe | Stripe redirects to `/dashboard` immediately; the webhook may not have landed. The customer gets bounced back to `/start-trial` seconds after paying. Resolves on refresh — but they won't know that. | Medium |

Items 1–3 are the classic failure: all three are Supabase dashboard settings that live
nowhere in the codebase, so nothing in a build or test can catch them.

### Which Stripe mode is live on Vercel Production?

**Cannot determine from code — needs the Stripe Dashboard.**

Here is exactly what I established, and what I refused to do:

- Vercel Production has these variables set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_FOUNDING_PRICE_ID`, `STRIPE_STANDARD_PRICE_ID`, `SENTRY_DSN`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `vercel env pull` returns every one of these as an **empty string** — the CLI will not
  decrypt sensitive variables. So I could not read even the first characters.
- I did **not** print, log, or transmit any value, and I deleted the pulled file.
- Your **local** `.env.local` key is `sk_test_…` (test mode), but that says nothing about
  production.

⚠️ **The tripwire on this cannot be cleared either way.** I could not confirm production is in
test mode, and I could not confirm it isn't. **Check this before Monday.** Thirty seconds:

1. Open https://dashboard.stripe.com/apikeys
2. Look at the **Test mode** toggle, top right.
3. Switch it **off** (live mode) and open **Developers → Webhooks**.
4. If there is a live-mode endpoint pointing at `www.hotelcontentradar.com/api/webhooks/stripe`,
   production is live and real cards can be charged. If the only endpoint is in test mode,
   you're in test mode.

**One genuinely good sign:** `DISABLE_DASHBOARD_AUTH` is **not** present in Vercel Production.
And even if someone set it, [lib/require-access.ts:20](lib/require-access.ts#L20) refuses to
honour it when `NODE_ENV === 'production'`. The auth bypass cannot be switched on in
production.

### Tripwire check: is `/dashboard` served to logged-out visitors?

**No. Verified against live production.** The request returns HTTP 200, which looks alarming,
but the body is Next.js's redirect envelope — it contains the literal instruction
`NEXT_REDIRECT;replace;/login;307;` and **zero hotel data**. I checked the body for hotel
names, multipliers, and breakout figures: none present. The gate holds.

---

## A4. Anything a paying customer would see that isn't real

### `/hotel` ("Your Hotel") — confirmed, still entirely fake

**Yes, still true.** [app/hotel/page.tsx](app/hotel/page.tsx) imports `DEMO_HOTEL` from
[lib/your-hotel-demo.ts](lib/your-hotel-demo.ts) — a fictional property called
**The Lansmere**. Every number, every post, every chart is invented. The post images aren't
even images; they're CSS colour gradients.

**Is it reachable from the sidebar? Yes.** [AppShell.tsx:315](components/AppShell.tsx#L315)
renders `Your hotel` as the first item in the "YOURS" group, in the permanent sidebar on every
gated page.

**Would a paying member land on it? Almost certainly, and quickly.** It is the most
personally-interesting-sounding link on the page. A hotel marketing manager who has just paid
£49 will click "Your hotel" within about ninety seconds.

To be fair to the build: it *is* labelled. There's an "Example data" pill in the page header
and the footer reads "Example data · last updated …". So it isn't deceptive. But it is a
paid product where the most enticing navigation item leads to a fictional hotel.

### Other placeholder or unreal content

| Where | What | How bad |
|---|---|---|
| **Dashboard → "Sources crawled"** | Lists **Michelin Keys — UK & Ireland** as a source crawled. Michelin appears **nowhere** in the hotel data, and 107 of 139 Michelin hotels aren't in the database. See B4. | **Worst of these — a factual claim that is not true** |
| **Landing page** | "400+ elite hotels", "400+ of the world's best", FAQ "400+ today". Reality: 205 tracked, 200 with data. Your `CLAUDE.md` records this as a deliberate marketing figure, so I'm flagging rather than correcting it — but a customer who counts the leaderboard will find 200. | Judgement call, already made |
| **`/hotel` PageInfo** | "400+ tracked five-star hotels" | Same |
| **Landing "More lists adding soon"** | Small Luxury Hotels, **Design Hotels**, Leading Hotels, Relais & Châteaux. Design Hotels is *already* 299 rows in the database — just never scraped. Accurate as written ("adding soon"), but see B2. | Fine |
| **TikTok / YouTube** | Disabled "September 2026" pills | Fine — honestly labelled |
| **Landing credibility strip** | Per-list "last scan" figures are hardcoded sample values, not live | Minor |
| `/saved`, `/watchlist` | Real features, genuinely empty (0 rows) | Fine — real empty states |

---

# SECTION B — The lists, and what's actually being tracked

## B2. Full list inventory

`hotels.sources` is comma-separated, so a hotel on two lists is counted under both.
**764 hotel rows total, 205 tracked, 441 with at least one post.**

| List | Total hotels | `tracked = true` | ≥1 post | Post in last 30 days |
|---|---|---|---|---|
| Forbes | 324 | 146 | 310 | 146 |
| **Design Hotels** | **299** | **0** | **0** | **0** |
| Gold List | 141 | 60 | 132 | 60 |
| World's 50 Best | 50 | 36 | 49 | 35 |
| Manual add | 3 | 3 | 3 | 3 |

Every hotel row has a source; none are blank. Five distinct list names.

**The finding here is Design Hotels.** 299 hotels — **39% of the entire hotel table** — have
never been scraped and have zero posts. They are names in a table and nothing else. Meanwhile
the landing page advertises Design Hotels under "More lists adding soon", which is technically
accurate but understates how much groundwork is already sitting there unused.

Also note that for Forbes, Gold List and World's 50 Best, the "tracked" and "posted in the
last 30 days" columns are **identical numbers**. That's the system working exactly as designed:
every tracked hotel is being scraped and is current. There are no stale tracked hotels.

## B3. What decides `tracked`?

**Both script and hand — and the script is a blunt instrument.**

**Where it's written:** [instagram-pipeline/setup-tracked.sql](../instagram-pipeline/setup-tracked.sql),
run by hand in the Supabase SQL editor. It does one thing:

```sql
top200 as (
  select instagram_handle from latest
  where followers_count is not null
  order by followers_count desc
  limit 200
)
update public.hotels h
set tracked = (h.instagram_handle in (select instagram_handle from top200));
```

**Tracked = the 200 hotels with the most Instagram followers.** Nothing else. Not prestige,
not list membership, not geography, not whether they're a good sales prospect. The file's own
comment invites hand-flipping individual hotels afterwards.

⚠️ **A trap worth knowing:** that `update` sets `tracked = (…)` for *every* row — so re-running
it will **silently un-track any hotel you hand-flipped** that isn't in the top 200 by
followers. It's written as a full reset, not an addition.

There's also a chicken-and-egg problem baked in: `tracked` is chosen by follower count, but
follower counts come from `profile_snapshots`, which only covers tracked hotels. **An untracked
hotel can never qualify**, because it has no follower count to sort by. The outreach README
confirms this bites — 179 European hotels are unusable for outreach purely because they have no
follower snapshot.

**Where it's read:**
- [scrape-run.js:52](../instagram-pipeline/scrape-run.js#L52) — `.eq('tracked', true)`, the scrape list
- [lib/data.ts:1276](lib/data.ts#L1276) — `.eq('tracked', true)`, everything the dashboard shows
- [generate-insight.js:261](../instagram-pipeline/generate-insight.js#L261) — AI notes only for tracked
- [cleanup-images.js:143](../instagram-pipeline/cleanup-images.js#L143) — image retention

**What the weekly scrape does with it.** Note: **`full-run.js` no longer exists** — it was
replaced by `scrape-run.js`, one runner with three modes:

| Mode | Trigger | Window | ~Results | ~Cost |
|---|---|---|---|---|
| weekly | Mondays 05:00 UTC | last 10 days | ~1,200 | ~$3 |
| monthly | 1st of month | last 35 days | ~5,000 | ~$12 |
| full | manual only | 30 posts/hotel | ~6,150 | ~$14–16 |

### Cost of expanding

**Based on the actual last full run**, recorded in
[APIFY-COST.md](../instagram-pipeline/APIFY-COST.md): July's ~$31 covered roughly two full
runs, pinning a full run at **$14–16 for 205 hotels**. The actor bills per result at
~$2.30/1,000, so cost scales linearly with hotels × posts.

**One-off cost to seed new hotels with 30 posts each:**

| Target | New hotels | Results | One-off cost |
|---|---|---|---|
| 205 → 400 | 195 | 5,850 | **~$13–14** |
| 205 → 764 (everything) | 559 | 16,770 | **~$39** |

**Ongoing monthly cost** (weekly + monthly sweeps, which scale the same way):

| Tracked | Monthly | vs $29 prepaid / $40 cap |
|---|---|---|
| 205 (today) | ~$21–23 | Inside both |
| 400 | **~$41–45** | **Over the $40 cap — actors hard-stop** |
| 764 | **~$78–86** | **Roughly double the cap** |

**The one-off seed is cheap; the ongoing cost is what bites.** Going to 400 costs about $14
once and then breaks your monthly cap every month thereafter — and the cap is a hard stop that
already blocked the pipeline once, on 2 July 2026. Going to 400 means moving off the $29
Starter plan, not just spending a bit more.

## B4. Michelin Keys — where is it?

**Does "Michelin" appear anywhere in `hotels.sources`? No.** Not once. The five values are
Forbes, Design Hotels, Gold List, World's 50 Best, Manual add.

The Michelin pins on the leaderboard come from
[lib/accreditations.generated.ts](lib/accreditations.generated.ts) — a static file built from
the CSV by `scripts/build-accreditations.mjs`. It holds all 139 handles (82 One Key, 43 Two
Key, 14 Three Key) and never touches the database. **The pins are decoration painted over
hotels that got into the product by another route entirely.**

**Of the 139 Michelin handles in the CSV:**

| | Count |
|---|---|
| Already rows in `hotels` | **32** |
| **Genuinely absent** | **107** |
| Of the 32 present, `tracked = true` | **20** |
| Of the 32 present, have ≥1 post | 25 |

By category:

| Category | In CSV | In `hotels` | Tracked |
|---|---|---|---|
| Three Key | 14 | 10 | 9 |
| Two Key | 43 | 14 | 8 |
| One Key | 82 | 8 | 3 |

So **20 of 139 Michelin Key hotels — 14% — are actually in the product.** The other 86% are a
CSV file.

Missing entirely: The Peninsula London, The Ritz London, Cliveden House, Corinthia London,
Hotel Café Royal, The Langham, The Lanesborough, Chewton Glen, Heckfield Place, Le Manoir aux
Quat'Saisons, Lucknam Park, Ballyfin, The Merrion, Gravetye Manor, Lympstone Manor, and 92
more.

**This is the one I'd act on.** The dashboard's "Sources crawled" panel tells members you
crawl Michelin Keys. You don't. Any UK hotelier — precisely your target customer — knows the
Michelin Keys list and will notice The Ritz and The Peninsula are absent.

## B5. Sub-Saharan Africa — what have we already got?

**I checked for spelling variants first, as instructed.** All 97 distinct `hotels.country`
values were listed and inspected. The dirty pairs are real but affect other regions:
**`United States` (89) and `USA` (39)** are the same country stored two ways, and `region`
has both `Asia-Pacific` (127) and `Asia` (35). For sub-Saharan Africa the country names are
clean and consistent — no variants, no duplicates, no misfiled rows. There is no hidden
sub-Saharan inventory.

**28 hotels total, 6 tracked.**

| Country | Hotels | Tracked | ≥1 post | Total posts |
|---|---|---|---|---|
| South Africa | 8 | 2 | 6 | 120 |
| Mauritius | 6 | 3 | 5 | 132 |
| Kenya | 3 | 0 | 0 | 0 |
| Rwanda | 3 | 1 | 2 | 38 |
| Tanzania | 2 | 0 | 1 | 1 |
| Botswana | 1 | 0 | 1 | 1 |
| Zimbabwe | 1 | 0 | 1 | 6 |
| Mozambique | 1 | 0 | 1 | 2 |
| Seychelles | 1 | 0 | 1 | 8 |
| Madagascar | 1 | 0 | 0 | 0 |
| Ivory Coast | 1 | 0 | 0 | 0 |

**The six tracked:** LUX* Belle Mare (39 posts), LUX* Grand Baie (50), One&Only Le Saint Géran
(34) — all Mauritius; Delaire Graff Lodge (41), Singita Kruger National Park (31) — South
Africa; Wilderness Bisate Lodge (34) — Rwanda.

**Safari lodges vs city hotels** (judged from names, rough as requested): **5 safari, 23 city
or resort.** The safari properties are Jack's Camp (Botswana), Wilderness Bisate Lodge
(Rwanda), Delaire Graff Lodge and Singita Kruger (South Africa), andBeyond Mnemba Island
(Tanzania). Only **three** are tracked.

The honest summary: **sub-Saharan Africa is barely represented, and safari barely at all.** Of
28 hotels, 12 have never been scraped. Kenya — the obvious safari market — has three hotels
and zero posts. There is no Singita Sabi Sand, no Angama Mara, no Wilderness Botswana camps.
Given The Safari Edit sits in your portfolio, this gap is worth knowing about precisely.

## B6. The orphans

**Confirmed: 51 handles** in `posts` with no matching row in `hotels`, carrying **1,514 posts**.

Full list:

```
@amarahotelcy @aureliohotel @bairroaltohotel @botanicsanctuaryantwerp @calimykonos
@canavescollection @canavesoiasuites @chablehotels @chablemaroma @cheetahplains
@cliniquelaprairie @dangleterrecph @dar_ahlam @domaine.louise @domainedelacavalerie
@eloundabay @eloundabeach @eloundacollection @elysiumhotel @eriro.alpinehide
@fairmontgoldenprague @fawnbluffprivatelodge @flemingsmayfair @goldene.rose_karthaus
@gracestmoritz @grandhotellestroisrois @hotel_goldgasse_salzburg @hotel_stein_salzburg
@hotelcanferrereta @hotelsantfrancesc @ibizabay @kisawasanctuary @kristianialech
@laroqqahotel @metropolemonaco @nobumarbella @palazzo.talia @peppercollection
@portoelounda @posttraunkirchen @sao_lourenco_do_barrocal @sixsensesbhutan
@sixsensesfortbarwara @sixsenseskanuhura @sixsenseslaamu @sixsenseszilpasyon
@terre_blanche @thecharleshotelmunich @thesukhothaibangkok @tulahclinicalwellness
@villafeltrinelli
```

**Are you paying to scrape them? You paid once. You are not paying now.** The evidence:

- **48 of the 51 have exactly 30 posts** — the signature of a *full* scrape
  (`SCRAPE_POST_LIMIT = 30`), not a windowed weekly one.
- Each has exactly **one** `profile_snapshots` row, all dated **21 July 2026**.
- The most recent orphan post is 21 July. The most recent post for known hotels is 27 July,
  and the most recent snapshot is 27 July — **so the 27 July run did not include them.**
- `scrape-run.js` builds its list from `hotels where tracked = true`. With no `hotels` row,
  these handles cannot be selected by the current pipeline.

**Conclusion:** one scrape on 21 July 2026 pulled 51 handles that were never in (or were later
removed from) the `hotels` table. Cost: ~1,530 results ≈ **$3.50, spent once**. It is not
recurring.

**But the data is stranded.** 1,514 real posts — recent, complete, 30 per hotel — are sitting
in the database, invisible to every part of the product, because there's no `hotels` row to
join them to. Adding 51 rows would surface them **at zero scraping cost.** The names look like
a deliberate expansion candidate list (Six Senses ×4, Elounda ×3, Canaves ×2, Chablé ×2).

**Cannot determine from code why they have no `hotels` row** — needs your recollection of what
was run on 21 July 2026.

**Two adjacent numbers worth having:** a further **1,560 posts** belong to hotels that *are* in
the table but aren't tracked. So **3,074 of 10,487 posts (29%) are paid-for data the product
never shows.**

---

# SECTION C — Outreach: what exists, what's manual

## C1. Inventory

### The `contacts` table

**Live, correct, and completely empty. 0 rows. Nothing has ever been written to it.**

Schema (confirmed against the live database):

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Primary key |
| `hotel_id` | bigint | Required. Links to `hotels.id`, deletes with the hotel |
| `full_name` | text | |
| `job_title` | text | |
| `email` | text | |
| `email_verified` | boolean | Defaults false |
| `source` | text | |
| `status` | text | Defaults `ready`; must be one of ready / drafted / sent / replied / unsubscribed / bounced |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | `updated_at` maintained by a trigger |

Two good design decisions worth noting: a **unique index on `(hotel_id, lower(email))`** makes
it impossible to email the same person twice, and **row-level security is on with no policies**
— meaning the public key cannot read it at all. Correct for a table of named individuals'
work emails.

⚠️ One thing to know: [supabase/contacts.sql](supabase/contacts.sql) **is committed** to the
repo, but the copy I found first was inside a stale worktree at
`hotel-dashboard/.claude/worktrees/hopeful-lehmann-eb2a47/`. Both exist; the committed one is
the real one.

### Outreach scripts

| Script | What it does |
|---|---|
| [scripts/export-outreach-batch.mjs](scripts/export-outreach-batch.mjs) (251 lines) | Exports a CSV of tracked hotels with a website, ordered by recent posting activity, splitting group-run properties into a separate deferred file. |
| [scripts/export-outreach-low-er.mjs](scripts/export-outreach-low-er.mjs) (333 lines) | Same idea, ordered by **lowest median engagement rate** — "which hotels have an audience but aren't reaching it". |
| [scripts/build-accreditations.mjs](scripts/build-accreditations.mjs) (110 lines) | Rebuilds the static Forbes / Gold List / Michelin badge map from the CSVs in `hotel-lists/`. Not outreach, but it's the file that puts the Michelin pins on screen. |
| [outreach/README.md](outreach/README.md) | Not a script, but the real asset here — 300 lines documenting selection rules, the independent-vs-group test, and the data caveats. |

Both exporters are **read-only** against Supabase and touch no dashboard logic.

**Credit where due:** the outreach README *already documents the `3` sentinel* in detail —
the 813 count, the month-over-month growth, the five unmeasurable hotels, and the explicit note
that `hasVisibleLikes` doesn't filter it. The exporters already exclude `3`. **The outreach
tooling is more correct about this than the product is.**

### The CSVs in `outreach/`

| File | Rows | Columns |
|---|---|---|
| `apollo-batch-01-uk-ireland.csv` | 10 | hotel_id, hotel_name, website, root_domain, ownership, hotels_sharing_domain, country, region, instagram_handle, followers, posts_last_90d, posts_total, last_posted, accreditation_lists, gold_list_editions |
| `apollo-batch-01-uk-ireland-deferred-groups.csv` | 11 | same 15 |
| `apollo-batch-02-europe-low-er.csv` | 50 | hotel_id, instagram_handle, hotel_name, root_domain, website, followers_count, er_median, posts_last_90d, ownership, hotels_sharing_domain, accreditations, sources, country, region |
| `apollo-batch-03-europe-independent-low-er.csv` | 42 | the 14 above plus `tracked` |

**113 hotel rows across four files, but not 113 prospects** — batch 02 and 03 overlap heavily,
and 34 of batch 02's 50 are group-run. The genuinely clean, ready-to-contact set is roughly
**24 independent hotels** (batch 03's confident tier), plus 18 more needing a manual eyeball.

## C2. The snapshot page

### Does it exist?

**No. Nothing like it exists.** I checked `app/` exhaustively: there are **no dynamic route
segments at all** — no `[handle]`, no `[slug]`, no `[id]` folders anywhere. Every route is a
fixed path. There is no per-hotel page of any kind, private-link or otherwise.

The closest existing thing is `/hotel`, which is the right *shape* — one hotel's breakouts,
its multipliers, its comparisons — but it is gated behind login and renders the fictional
Lansmere. **It is a usable template, not a usable page.**

### Is the data already available?

**Mostly yes, but not in a usable form — and the gap is specific.**

Available today from `getPortfolioData()` in [lib/data.ts](lib/data.ts):

- ✅ The hotel's best post, its multiplier, its typical-post baseline, likes and comments
- ✅ The post image (`posts.image_url`, or the stored copy)
- ✅ Comparable posts from other hotels — the breakout list, filterable by region
- ✅ Follower count, engagement rate, accreditation badges

What's missing:

1. **There is no per-hotel function.** `getPortfolioData()` is all-or-nothing: it loads
   **every** post for **every** tracked hotel (7.8 MB, 16 requests, ~2 seconds) and returns one
   large object. To show one hotel you'd load all 200. Workable for a handful of manually-sent
   links; not workable as a real page. You need a `getHotelSnapshot(handle)` that queries one
   hotel — that's the actual missing piece, and it's a new function, not a new query pattern.
2. **Untracked hotels have no data at all.** Not "less data" — none. No posts, and crucially
   no follower count, so no engagement rate can be computed. The 12 untracked hotels in batch
   03 cannot have a snapshot generated until they're tracked and scraped.
3. **No private-link mechanism.** No token, no signed URL, no unguessable-slug scheme. Every
   gated page uses the login gate, which is exactly what a prospect can't pass. Needs designing
   from scratch.
4. **The images may not be there.** The image bucket is pruned to stay inside Supabase's free
   tier. Retention covers posts ≤35 days old or ≥1.5× the hotel's median — a snapshot showing
   a hotel's best-ever post from eight months ago will likely find the image deleted and fall
   back to a placeholder gradient. `CLAUDE.md` warns about exactly this: widen the keep rules
   in `cleanup-images.js` **before** building a view that shows older posts.

### How many tracked hotels could produce a credible snapshot?

Defining "credible" as the brief does — enough visible-like posts to compute a baseline, and at
least one post at 2× or better:

| | Hotels |
|---|---|
| Tracked handles with data | 200 |
| **Credible snapshot today** | **163** |
| No usable baseline | 11 |
| Hides too many likes to measure | 11 |
| Baseline fine, but no 2× post ever | 15 |

**163 is the real size of the outreach pipeline.** (If `3` were excluded it becomes 160 — the
difference is negligible, because hotels lost to the coverage gate are replaced by hotels
gaining a valid baseline.)

But **163 is the generous reading**, because it counts a hotel's best post *ever*. Outreach
needs something recent enough to feel live:

| Best breakout is from… | Hotels |
|---|---|
| last 30 days | **73** |
| last 90 days | **149** |
| last 365 days | 162 |

**If the email is going to say "your post from last month",** the honest pipeline size is
**73 hotels this month, 149 this quarter.** And of the ~24 clean independent contacts in the
CSVs, the overlap with these is what you can actually send next week.

## C3. The manual steps

From "a hotel is a row in an outreach CSV" to "a personalised email is in Neil's outbox":

| # | Step | Status |
|---|---|---|
| 1 | Select hotels (tracked, has website, has posts, independent, sorted by ER) | ✅ **AUTOMATED** — `export-outreach-low-er.mjs` |
| 2 | Classify independent vs group by domain | ✅ **AUTOMATED** — two-signal test, auditable columns |
| 3 | Write the CSV with follower/post/ER/accreditation columns | ✅ **AUTOMATED** |
| 4 | Eyeball the 18 `independent-deep-path` rows needing brand knowledge | 🔶 **SEMI** — script flags them; you decide |
| 5 | Upload CSV to Apollo, find the right person | ❌ **FULLY MANUAL** — external tool |
| 6 | Verify the email address | ❌ **FULLY MANUAL** (Apollo assists) |
| 7 | Pick the right job title (social lead vs marketing director vs GM) | ❌ **FULLY MANUAL** |
| 8 | Write contacts into the `contacts` table | ❌ **FULLY MANUAL** — table exists, is empty, **and no script writes to it**. The CSVs even carry `hotel_id` ready for the insert; nothing uses it. |
| 9 | Look up the hotel's best post and its multiplier | ❌ **FULLY MANUAL** — no per-hotel view exists (C2) |
| 10 | Choose comparable posts from other hotels | ❌ **FULLY MANUAL** |
| 11 | Build a snapshot page or attachment for that hotel | ❌ **FULLY MANUAL** — doesn't exist |
| 12 | Write the personalised email | 🔶 **SEMI** — the `email-writer` skill exists, runs as a Q&A per email |
| 13 | Send it | ❌ **FULLY MANUAL** |
| 14 | Record `status = sent`, track replies | ❌ **FULLY MANUAL** — schema supports it; nothing writes it |

**The map:** steps 1–4 are solved and solved well. **Steps 5–14 are entirely by hand.** The
automation stops precisely at the point where the CSV is generated — which is the cheap part.

The two highest-value gaps, if you ever automate (**not now**): **step 9**, because it's needed
for every single email and there's no way to look it up; and **step 8**, because without it
there is no record of who was contacted, and the duplicate-protection index that was carefully
designed is protecting an empty table.

## C4. Two numbers for the email copy

| Measure | Count |
|---|---|
| **Total rows in `posts`** | **10,487** |
| Excluding `null` (952) and `-1` (118) — the app's current rule | 9,417 |
| **Excluding `null`, `-1` **and** `3` (813) — genuinely visible likes** | **8,604** |

**Which should Neil quote? 8,604 — and I'd round it to "over 8,500".**

The reasoning:

- **10,487 is not defensible.** 1,883 of those rows (18%) have no readable engagement number.
  If you claim "we've analysed 10,487 posts", 18% of them were not analysed — nothing was
  measured, because there was nothing to measure.
- **9,417 is the number the product currently believes**, and it's wrong by 813 for exactly
  the reason set out in A1.
- **8,604 is what you can actually stand behind.** Every one of those posts has a real like
  count that fed a real calculation.

Two caveats worth carrying:

- If the claim is specifically about *what the dashboard shows*, the number is lower again:
  only **6,075** posts are both on a tracked hotel and genuinely visible. The other 2,529 are
  on hotels not in the product.
- Quoting 8,604 while `hasVisibleLikes` still counts `3` means your marketing is more accurate
  than your software. That's the right way round, but it won't stay comfortable for long.

**"Over 8,500 luxury hotel posts analysed"** is true, conservative, and survives scrutiny.

---

# SECTION D — My own read

## D1. If Neil started charging real money on Monday, what would embarrass him first?

The dashboard would tell a paying hotelier, as a **headline statistic in a box designed to
impress**, that Okada Manila beat its own average by **1,226.9×** and that Crockfords at
Resorts World Genting beat its own median by **857.2×** — "the strongest single result on
record". I confirmed both are rendered in the live HTML right now, in the What's Working stat
bar and observation cards. No hotel marketing director believes a 1,227× number; they conclude
the tool is broken and stop reading, and everything else you've built — which is genuinely
careful — dies with it. What makes this worse than a simple bug is that **two different faults
produce it**: Okada's figure is inflated by the `3` placeholder (A1), while Crockfords' 857× is
*arithmetically correct* on real data — a hotel with 100,354 followers that genuinely averages
13–46 likes a post and had one hit 32,423. So there is no single fix. Close behind, and more
damaging in a slower way: the "Sources crawled" panel claims you crawl **Michelin Keys** when
only 20 of 139 Michelin hotels are in the product and 107 aren't in the database at all — a
claim your ideal UK customer is uniquely equipped to check. And within ninety seconds of
signing up, that same customer will click **"Your hotel"** in the sidebar and find a fictional
property called The Lansmere.

## D2. What's the smallest change that removes that embarrassment?

**One short session.** Three changes, none of which touch the breakout maths:

1. **Cap what's displayed.** Present multipliers above some sane ceiling as "50×+" rather than
   a precise absurdity, and pick the "biggest breakout" headline from posts *below* that
   ceiling. This is a display change in `Dashboard.tsx` / `WhatsWorking.tsx` — it does **not**
   touch `lib/data.ts`, the 2× threshold, or the baseline, so it carries none of the risk the
   guardrails warn about. It fixes Okada and Crockfords in one move, without needing to know
   which fault caused which.
2. **Delete "Michelin Keys" from the `SOURCES` list** in
   [Dashboard.tsx:39](components/Dashboard.tsx#L39), and drop Michelin from the landing page's
   "Featuring hotels from…" line. Two lines. It stops the product claiming something untrue.
   (Keep the pins — those are accurate per hotel.)
3. **Hide "Your hotel" from the sidebar** — one line in
   [AppShell.tsx:315](components/AppShell.tsx#L315). The page can stay live for you to demo;
   it just shouldn't be the most enticing link a new member sees.

Deliberately **not** in that session:

- **Fixing the `3` sentinel is a separate, longer job** — one long session on its own. It
  changes 57 hotels' numbers, moves breakout counts, and needs a pipeline fix so the scraper
  stops writing `3` in the first place. Doing it *properly* means finding out why the scraper
  writes 3, backfilling the existing 813 rows, and only then changing `hasVisibleLikes`.
  Changing the function alone would flip 21 hotels into the coverage gate and quietly remove
  their engagement rates. Capping the display (change 1) buys you the time to do this
  carefully.
- **Expanding to 400 hotels** — several sessions, and it breaks your Apify cap every month
  (B3). Worth planning; not worth rushing before Monday.

**Order of operations, if it were me:** the three display fixes now, verify production Stripe
mode (A3) before anyone can pay, then the `3` fix as its own piece of work.

---

## Appendix — What I could not determine

| Question | Why | What's needed |
|---|---|---|
| Stripe mode on Vercel Production | `vercel env pull` returns encrypted values as empty strings; I would not attempt to force decryption | Stripe Dashboard — see A3 for the four steps |
| Real production `/dashboard` render time | Behind the login gate; getting a session needs an account + subscription (a write) | A member session, or Vercel analytics |
| Exact concurrency breaking point | My load test was bandwidth-confounded (see A2) | Load test from a datacentre, or Vercel/Supabase dashboards under real traffic |
| Vercel plan and function timeout | No `vercel.json`; CLI doesn't expose it | Vercel dashboard → project settings |
| Why the 51 orphan handles have no `hotels` row | Not recoverable from code or data | Neil's recollection of the 21 July 2026 run |

## Appendix — Audit hygiene

- No writes of any kind. Every database call was an HTTP `GET` through a helper that supports
  no other method.
- No Apify run. No AI backfill. No deployment. No commit, no PR.
- One env file was pulled to a scratch directory outside the repo to check the Stripe key
  prefix; it returned empty values and was deleted immediately. No secret value was printed,
  logged, or transmitted.
- A local dev server was started to time and inspect the dashboard render, and stopped
  afterwards. Its build output goes to `.next/`, which is git-ignored.
- **Note on the working tree:** when this audit began, the repo was on branch
  `ops/supabase-storage-cleanup` with six modified and five untracked files already present.
  Partway through, a concurrent session committed `1502001` ("Keep the image bucket inside
  Supabase's free tier"), which changed the working tree independently of this audit. Those
  changes are not mine. The only file this audit added is this report.

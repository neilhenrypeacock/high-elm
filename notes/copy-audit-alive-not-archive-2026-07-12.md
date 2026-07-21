# Copy Audit — "Alive, not Archive"
**Date:** 12 July 2026 · **Scope:** `hotel-dashboard/` (read-only; no files modified)
**Test applied to every line:** *Does this sentence give the reader a reason to be here again next Tuesday — or does it imply they could get everything they need today?*

**Headline:** **9 ARCHIVE** verdicts and **2 CONTRADICTION** verdicts (11 flagged lines total). The two contradictions both sit on the public landing page, in the two sections that do the most selling ("How it works" step 3 and "What you get" card 02). The gated app is largely healthy — the dashboard hero is genuinely alive — but the words **"library"**, **"browse"** and **"Hall of Fame"** recur at exactly the moments a user decides whether £39/month is worth keeping.

---

## Section A — Inventory

| File | What its copy does |
|---|---|
| `hotel-dashboard/app/layout.tsx` | Global `<title>` + meta description |
| `hotel-dashboard/app/page.tsx` | Landing page metadata (title + description) |
| `hotel-dashboard/components/Landing.tsx` | The full marketing landing page: nav, hero, taster, how-it-works, what-you-get, pricing, FAQ, footer |
| `hotel-dashboard/components/PublicChrome.tsx` | Shared public nav + footer (How it works / About pages) |
| `hotel-dashboard/app/how-it-works/page.tsx` | Public marketing page: method, four features, time windows, honesty section, CTA |
| `hotel-dashboard/app/about/page.tsx` | Public marketing page: who built it, why, closing CTA |
| `hotel-dashboard/app/login/page.tsx` + `components/LoginForm.tsx` | Login card, password/magic-link copy, error strings |
| `hotel-dashboard/app/start-trial/page.tsx` + `components/SignupForm.tsx` / `TrialSignupForm.tsx` | Trial signup (beta form + dormant Stripe email-capture form) |
| `hotel-dashboard/app/subscribe/page.tsx` | Lapsed-member re-subscribe page |
| `hotel-dashboard/app/dashboard/page.tsx` + `components/Dashboard.tsx` | Gated dashboard: hero ("This week"), by-the-numbers, in-focus bullets, watchlist panel, sources panel |
| `hotel-dashboard/components/ContentRadar.tsx` | Top posts: window toggle, filters, cards, rows, empty states |
| `hotel-dashboard/components/WhatsWorking.tsx` | Portfolio analysis section chrome + chart captions |
| `hotel-dashboard/components/HotelTable.tsx` | Leaderboard: column labels, filters, methodology footnote |
| `hotel-dashboard/components/AppShell.tsx` | Gated sidebar nav labels, beta feedback card, member card |
| `hotel-dashboard/components/AppFooter.tsx` | Gated/auth footer (carries "Updated weekly · date" note from dashboard) |
| `hotel-dashboard/components/PageInfo.tsx` | "About this view" modal copy for all nine views |
| `hotel-dashboard/components/WelcomeOverlay.tsx` | First-login 4-step orientation overlay |
| `hotel-dashboard/app/saved/page.tsx` + `components/SavedPostsList.tsx` + `components/EmptyState.tsx` | Saved page header, empty states, CTAs |
| `hotel-dashboard/app/watchlist/page.tsx` + `components/WatchlistTable.tsx` | Watchlist page header, empty states, CTAs |
| `hotel-dashboard/app/hotel/page.tsx` + `components/YourHotel.tsx` | "Your Hotel" mirror page (example data), section heads, honesty footnote |
| `hotel-dashboard/app/profile/page.tsx` + `components/ProfileForm.tsx` / `SetPasswordForm.tsx` | Profile page copy + form labels/errors |
| `hotel-dashboard/app/settings/page.tsx` + `components/ManageBillingButton.tsx` / `ThemeToggle.tsx` | Settings cards: membership, billing, appearance |
| `hotel-dashboard/app/error.tsx` / `app/loading.tsx` | Branded error + loading states |
| `hotel-dashboard/components/AccountFrame.tsx` / `Lockup.tsx` | Page-header frame (copy passed in by pages); brand lockup + endorsement line |
| `hotel-dashboard/lib/data.ts` | **Copy lives here too:** What's Working ledes (`WW_LEDE`), stat captions, `bestPostsTitle`, `TIME_WINDOWS` toggle labels. Read for copy only — constants/logic untouched. |
| `hotel-dashboard/lib/your-hotel-demo.ts` | Demo captions + "Takeaway" insight copy for the example hotel |
| `hotel-dashboard/app/api/*` routes | User-visible error strings surfaced in the forms (inventoried; all NEUTRAL utility copy) |

**Expected files that do NOT exist:**
- `content-radar-landing-copy.md` — **not found anywhere in the repo** (checked the full monorepo, and git history shows no tracked deletion). The landing copy's only source of truth is `components/Landing.tsx` itself.
- Transactional email copy — **not in the repo.** The magic-link email is sent via Supabase Auth's hosted template (`lib/magic-link.ts` just calls `signInWithOtp`), and Stripe emails are Stripe-hosted. Neither can be audited here; both should be checked in their dashboards for archive language.

**Found beyond the brief's expected list:** `Dashboard.tsx`, `WhatsWorking.tsx`, `HotelTable.tsx`, `YourHotel.tsx`, `PageInfo.tsx`, `AppFooter.tsx`, `AccountFrame.tsx`, `SavedPostsList.tsx`, `WatchlistTable.tsx`, `SignupForm.tsx`, `SetPasswordForm.tsx`, `ProfileForm.tsx`, `ManageBillingButton.tsx`, `ThemeToggle.tsx`, `Lockup.tsx`, `app/error.tsx`, `app/loading.tsx`, `app/subscribe/`, `app/profile/`, `app/settings/`, `app/hotel/`, plus copy strings inside `lib/data.ts` and `lib/your-hotel-demo.ts`, and API-route error strings. There is no `components/AppShell.tsx` footer copy beyond nav labels; note also that the `CERTS` array in `Landing.tsx:25-41` (hardcoded "3,540 posts scanned"-style figures) is **defined but never rendered** — dead data, not user-facing.

---

## Section B — Line-by-line audit

Verdicts: **ALIVE** (reinforces recurrence — leave alone) · **ARCHIVE** (implies a static, finite collection — flag) · **NEUTRAL** (says nothing either way) · **CONTRADICTION** (actively undercuts recurrence).

### Public — metadata

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `app/layout.tsx` | 24 | `Content Radar — powered by High Elm Studio` | NEUTRAL | Global fallback title; no time words, no harm |
| `app/layout.tsx` | 26 | `Hotel posts ranked by how far each beat its own hotel's normal — not by account size.` | NEUTRAL | Explains the method, not the rhythm. Search snippet misses the weekly hook |
| `app/page.tsx` | 8 | `Content Radar — Never run out of proven Instagram ideas` | ALIVE | "Never run out" is recurrence — the supply keeps coming |
| `app/page.tsx` | 10 | `Every week, Content Radar tracks the world's finest hotels and surfaces the exact posts beating their own engagement — the last 7 days, the last 30 days, and all time.` | ALIVE | Leads with "Every week"; all-time is correctly last |

### Public — `components/Landing.tsx`

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `Landing.tsx` | 320 | `start free trial` (nav CTA) | NEUTRAL | Standard CTA |
| `Landing.tsx` | 330 | `See exactly what content is going viral for the world's best luxury hotels — every week.` | ALIVE | The H1 ends on the cadence. Exactly right |
| `Landing.tsx` | 332 | `No more guessing. Ever.` | NEUTRAL | Benefit, not rhythm |
| `Landing.tsx` | 334 | `400+ of the world's best luxury hotels every week. Not theory. Not guesswork. Not strategy. Just the best content.` | ALIVE | "every week" present — but see Section E: "400+" conflicts with "200+" claimed elsewhere |
| `Landing.tsx` | 341 | `Only the world's genuine 5-star hotels` | NEUTRAL | Quality claim |
| `Landing.tsx` | 349 | `posts beat their hotel's own average this week` | ALIVE | Live weekly number, anchored to "this week" |
| `Landing.tsx` | 350 | `week ending {date}` | ALIVE | Timestamps the data — signals freshness |
| `Landing.tsx` | 355–359 | `{n}+ hotels · {n} countries · {n} posts analysed` | NEUTRAL | Static-sounding totals, but sitting inside a "this week" panel so they read as scale, not the value claim |
| `Landing.tsx` | 364–365 | `start your free trial` / `£39/month after 14 days · cancel anytime` | NEUTRAL | Mechanics |
| `Landing.tsx` | 374 | `Built for the person running a luxury hotel's social media.` | NEUTRAL | Audience line |
| `Landing.tsx` | 383 | `This week's breakouts — real posts, live right now` | ALIVE | "live right now" + pinging dot — the strongest freshness signal on the page |
| `Landing.tsx` | 409 | `See every breakout this week — plus the last 30 days and the all-time Hall of Fame.` | **ARCHIVE** | This is the single conversion-gate line over the locked cards, and it *ends* on the archive. The last thing read before the CTA is "all-time Hall of Fame" — the browsable, finishable thing |
| `Landing.tsx` | 425 | `From the world's best hotels to your dashboard, every Monday.` | ALIVE | "Thing that arrives" framing, with a named day — but see Section E on whether "every Monday" is a keepable promise |
| `Landing.tsx` | 426 | `No spreadsheets. No scraping. No guesswork. Three steps, every single week.` | ALIVE | Cadence restated |
| `Landing.tsx` | 430 | `We scan · 200+ elite hotels, every week` + body `Every week we scan the latest social media posts…` | ALIVE | Good — though "200+" here vs "400+" in the hero (Section E) |
| `Landing.tsx` | 431 | `We share · Every post that's worth looking at` + body `Every breakout post — the ones that have gone viral, are going viral now…` | ALIVE | "going viral now" keeps it present-tense |
| `Landing.tsx` | 432 | `You create · New inspiration every week` + body `Enjoy an exhaustive library of the industry's best-performing content ideas — ranked best-first and ready to inspire…` | **CONTRADICTION** | The title says "every week"; the body immediately undercuts it with **"an exhaustive library"** — *exhaustive* literally means "you can finish it". The payoff step of How-it-works tells the reader the product is a completable collection |
| `Landing.tsx` | 445 | `Browse three ways` | **ARCHIVE** | "Browse" frames the product as a place you wander, and elevates the window filter to a headline behaviour |
| `Landing.tsx` | 447–449 | `Last 7 days · this week's breakouts` / `Last 30 days · the month` / `All time · the Hall of Fame` | **ARCHIVE** | The chips themselves are fine as filters, but naming all-time "the Hall of Fame" gives the archive a brand while this-week gets none |
| `Landing.tsx` | 465–466 | `Certified among the best, compared against their own baseline.` | NEUTRAL | Credibility |
| `Landing.tsx` | 471 | `…the Condé Nast Gold List and Forbes Five-Star, with more of the industry's most respected lists added every week.` | ALIVE | Growing-set claim — see Section E honesty flag |
| `Landing.tsx` | 474 | `It's not about who's biggest. It's about the best ideas. It's about what's working.` | NEUTRAL | Method |
| `Landing.tsx` | 488 | `Four ways to never face a blank calendar again.` | ALIVE | The pain is recurring (the calendar refills), so the promise is recurring |
| `Landing.tsx` | 492 | `01 · this week — This Week's Breakouts: Never face a blank content calendar again. The posts proven to work this week, ranked best-first.` | ALIVE | Anchored to this week |
| `Landing.tsx` | 493 | `02 · the library — The 30-Day & All-Time Hall of Fame: The strongest ideas ever recorded, not just this week's. A permanent library to draw from.` | **CONTRADICTION** | The worst line on the site. A quarter of "What you get" is explicitly branded **"the library"** and sold as **"permanent"** — the exact one-time value proposition the subscription must not be. "Not just this week's" actively demotes the weekly feed |
| `Landing.tsx` | 494 | `03 · the strategy — The Posting Playbook: See when and how often the best hotels post… The strategy thinking, done for you.` | NEUTRAL | No time words; a "playbook" is also screenshot-able, but it's method not collection |
| `Landing.tsx` | 495 | `04 · coming soon — TikTok & YouTube — September 2026: More channels are coming. Founding members — the first 50 — lock in this Instagram rate for good.` | ALIVE | The product itself grows — good recurrence signal |
| `Landing.tsx` | 509–518 | `Founding Member` / `£39 /month` / `Instagram channel` / `Fixed forever — first 50 members only` / `14-day free trial to start` / `Cancel anytime` | NEUTRAL | The pricing card justifies the *price mechanics* but never states the *recurring benefit* — see Section D |
| `Landing.tsx` | 526 | `{n} of 50 founding spots claimed` | NEUTRAL | Scarcity, not recurrence |
| `Landing.tsx` | 534 | `More channels are coming. Founding members lock in this rate on Instagram for good.` | ALIVE | Forward motion |
| `Landing.tsx` | 546 | FAQ: `…TikTok and YouTube are coming September 2026, and founding members lock in this Instagram rate for good.` | ALIVE | Growth |
| `Landing.tsx` | 548 | FAQ: `200+ today, with more hotels and more ranking lists added every week. We're building toward 1,000+… so the list only gets better the longer you're a member.` | ALIVE | The best retention argument on the site — "gets better the longer you're a member". Honesty flag in Section E on "added every week" |
| `Landing.tsx` | 549 | FAQ: `…with more respected lists added weekly. Never a random scrape.` | ALIVE | Same honesty flag |
| `Landing.tsx` | 550 | FAQ: `Yes. Start with a 14-day free trial, and cancel whenever you like…` | NEUTRAL | Mechanics |
| `Landing.tsx` | 563 | `See this week's winners before you pay.` | ALIVE | Closing CTA anchored to this week |
| `Landing.tsx` | 577 | `Viral hotel content, in your pocket.` | NEUTRAL | Footer strapline has no rhythm — missed opportunity (Section D) |
| `Landing.tsx` | 582 | `High Elm Studio is a luxury brand agency working at the edge of smart technology…` | NEUTRAL | Endorsement |
| `Landing.tsx` | 602 | `All figures from public Instagram data.` | NEUTRAL | Honesty line |

### Public — How it works / About / chrome

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `app/how-it-works/page.tsx` | 8 | `How Content Radar finds the hotel posts that beat their own hotel's average by 2× or more — ranked, explained, and updated every week.` | ALIVE | Meta description ends on the cadence |
| `app/how-it-works/page.tsx` | 129 | `Every winning hotel post, measured against its own account.` | NEUTRAL | Method headline |
| `app/how-it-works/page.tsx` | 132–134 | `Content Radar watches the world's best luxury hotels on Instagram and surfaces the posts that genuinely outperform…` | ALIVE | Present-continuous "watches… surfaces" = an ongoing service |
| `app/how-it-works/page.tsx` | 144 | `A post is a "breakout" when it beats its own hotel's average by 2× or more.` | NEUTRAL | Definition |
| `app/how-it-works/page.tsx` | 159 | `Four ways to read what's working.` | NEUTRAL | — |
| `app/how-it-works/page.tsx` | 161–165 | `The breakout feed: Every post that beat its hotel's average by 2× or more, ranked best-first…` | ALIVE | "Feed" is the right noun — feeds refill |
| `app/how-it-works/page.tsx` | 170–173 | `What's working — the patterns: …which formats, caption lengths, days of the week… are pulling the most engagement right now.` | ALIVE | "right now" |
| `app/how-it-works/page.tsx` | 185 | `This week's signal, or a deeper well of proven ideas.` | NEUTRAL | Balanced — week first, depth second. "Well" is better than "library" (wells refill) |
| `app/how-it-works/page.tsx` | 186–190 | `…widen to 30 days or all time when you want the biggest possible library of ideas that have already proven themselves. It's refreshed every week, so it never runs dry.` | **ARCHIVE** | "the biggest possible library" is the archive frame again — partially rescued by "refreshed every week, so it never runs dry", but the sentence teaches the reader that the product's depth (not its freshness) is the point |
| `app/how-it-works/page.tsx` | 200–204 | `Content Radar reads only what's public on Instagram… Instagram is live today, with more channels on the way.` | ALIVE | Honest + growing |
| `app/how-it-works/page.tsx` | 212–213 | `See this week's breakouts for yourself.` / `Start a 14-day free trial and get the full dashboard — the breakout feed, the patterns, and the leaderboard.` | ALIVE | Week-anchored close |
| `app/about/page.tsx` | 8 | `Content Radar is powered by High Elm Studio, a boutique UK creative agency…` | NEUTRAL | Meta description |
| `app/about/page.tsx` | 47 | `Built by people who work in luxury content every day.` | NEUTRAL | Credibility |
| `app/about/page.tsx` | 56 | `…what's actually working right now?` | ALIVE | Present tense |
| `app/about/page.tsx` | 62 | `…every post measured against its own hotel, the real winners ranked in front of you, refreshed every week.` | ALIVE | — |
| `app/about/page.tsx` | 65 | `It's a simple promise — never stare at a blank content calendar again — backed by real data…` | ALIVE | Recurring pain, recurring cure |
| `app/about/page.tsx` | 86 | `Put proven ideas in front of you, every week.` | ALIVE | "Thing that arrives" framing — model copy |
| `components/PublicChrome.tsx` | 13–16, 82, 101 | Nav labels: `How it works` / `About` / `Log in` / `Start free trial` | NEUTRAL | Standard nav |

### Conversion pages & forms

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `app/login/page.tsx` | 38–41 | `Log in to Content Radar` / `Welcome back — enter your details to open your dashboard.` | NEUTRAL | Utility |
| `app/subscribe/page.tsx` | 37 | `You don't have an active trial` | NEUTRAL | Statement of fact |
| `app/subscribe/page.tsx` | 40–41 | `Your account isn't on an active trial or subscription. Start a 14-day free trial to get back into the dashboard.` | NEUTRAL | "Get back into the dashboard" is place-framing at the single most churn-critical page — no reason-to-return stated (Section D) |
| `app/start-trial/page.tsx` | 58 | `Create your account and you're straight in — 14 days of the full dashboard, no card needed.` | NEUTRAL | Access, not rhythm |
| `app/start-trial/page.tsx` | 60 | `Enter your email and we'll take you to a secure checkout to set up your 14-day trial.` | NEUTRAL | (Stripe mode, currently dormant) |
| `components/SignupForm.tsx` | 99–103 | `You're in — trial started` / `Opening your dashboard…` | NEUTRAL | Success beat |
| `components/SignupForm.tsx` | 230 | `14 days free · no card needed during the beta · full dashboard access` | NEUTRAL | Mechanics |
| `components/TrialSignupForm.tsx` | 82–83 | `14 days free, then £40/month. Card required to start — cancel any time before your trial ends and you won't be charged.` | NEUTRAL | **£40 here vs £39 on the landing page** — see Section E |
| `components/LoginForm.tsx` | 100, 118, 158, 161–171 | `Check your email for a link to log in.` / `Email me a login link` / `Log in` / `No password yet, or forgotten it?…` | NEUTRAL | Utility |
| API routes (various) | — | Error strings (`Wrong email or password.`, `Too many attempts — try again in a minute.`, etc.) | NEUTRAL | All utility copy; nothing archive-flavoured |

### Gated app — dashboard

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `app/dashboard/page.tsx` | 33 | `Updated weekly · {date}` (footer note) | ALIVE | Every gated page footer carries the cadence + last-update date |
| `components/Dashboard.tsx` | 355 | `This week · Instagram` | ALIVE | Section kicker |
| `components/Dashboard.tsx` | 368 | `{n} posts significantly outperformed` | ALIVE | Weekly hero numeral |
| `components/Dashboard.tsx` | 371–379 | `Beating their hotel's own median this week — and {n} cleared ten times their usual engagement — refreshed every week.` | ALIVE | Explicit "refreshed every week" under the hero |
| `components/Dashboard.tsx` | 383–385 | `No posts significantly outperformed their hotel's own median this week.` | NEUTRAL | Honest zero-state, but no "next scan lands Monday" line (Section D) |
| `components/Dashboard.tsx` | 414 | `This week · by the numbers` | ALIVE | — |
| `components/Dashboard.tsx` | 459 | `This week · in focus` | ALIVE | — |
| `components/Dashboard.tsx` | 484 | `Not enough data this week to surface highlights yet — check back after the next scrape.` | ALIVE | "check back" is right; "scrape" is internal jargon that dents the premium feel — suggest "next weekly scan" |
| `components/Dashboard.tsx` | 248–251 | `Nothing on your watchlist yet` / `Follow the hotels you care about and their breakouts surface here first, every week.` | ALIVE | Model empty-state — names the recurring payoff |
| `components/Dashboard.tsx` | 266 | `Browse the leaderboard →` | **ARCHIVE** | "Browse" again, on the CTA out of that same empty state. Minor, but the word choice trains the wandering-a-place behaviour |
| `components/Dashboard.tsx` | 281–283 | `You don't have to trust us — just the lists the industry already trusts. Every tracked hotel is drawn from these.` | NEUTRAL | Credibility |

### Gated app — Top posts (`ContentRadar.tsx`) & window labels

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `lib/data.ts` | 40–42 | Toggle labels: `Last 7 days` / `Last 30 days` / `All time` | NEUTRAL | Correct hierarchy — all-time is a filter option, not the headline |
| `components/ContentRadar.tsx` | 749–751 | `No posts broke meaningfully past their hotel's own median this week.` / `…in this window.` | NEUTRAL | Honest, but ends dead — no come-back line (Section D) |
| `components/ContentRadar.tsx` | 760–762 | `Top {n} best-performing posts on record` (all-time view note) | NEUTRAL | Supporting caption inside a filter — acceptable |
| `components/ContentRadar.tsx` | 342/516 | `vs hotel median` / `vs median` | NEUTRAL | Metric labels |
| `components/ContentRadar.tsx` | 376 | `Editor's note` | ALIVE | Human editorial presence implies someone is *here, working, weekly* |
| `components/ContentRadar.tsx` | 314 | `Editor's Pick` | ALIVE | Same |
| `components/ContentRadar.tsx` | 683/712 | Collab filter tooltip + footnote | NEUTRAL | Method |

### Gated app — What's Working / Leaderboard

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `components/WhatsWorking.tsx` | 249 | `What's working across the portfolio` | ALIVE | Present tense |
| `lib/data.ts` | 408–413 | `WW_LEDE.month`: `What moved across the tracked hotels over the last 30 days — the patterns behind the breakouts…` / `WW_LEDE.all`: `Across everything we've tracked, the steady patterns…` | NEUTRAL | Month lede is window-anchored (good); all-time lede is fine as the filter's own caption |
| `lib/data.ts` | 480/488 | `Best posts this month` / `Best posts on record` | NEUTRAL | Correct: "on record" only inside the all-time scope |
| `components/WhatsWorking.tsx` | 262 | `What we're seeing` | ALIVE | Present-continuous — someone is watching for you |
| `components/HotelTable.tsx` | 426–432 | Eng. rate methodology footnote | NEUTRAL | Method |

### Gated app — orientation & info copy

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `components/WelcomeOverlay.tsx` | 16–18 | Step 1: `Welcome to Content Radar / What a "breakout" means…` | NEUTRAL | Teaches the metric — but the overlay as a whole never mentions the weekly rhythm (Section D, biggest gap) |
| `components/WelcomeOverlay.tsx` | 21–23 | Step 2: `…Start on 7 days for this week's signal, widen to 30 days or all time when you want a deeper well of proven ideas.` | NEUTRAL | Same "deeper well" balance as How-it-works — acceptable |
| `components/WelcomeOverlay.tsx` | 26–28 | Step 3: `The Hotel leaderboard ranks every tracked hotel by true engagement rate — the average across each hotel's last 30 posts…` | NEUTRAL | **Stale**: the leaderboard now ranks by day-window rate (30/90-day total ÷ followers), not "average across last 30 posts" (Section E) |
| `components/WelcomeOverlay.tsx` | 31–33 | Step 4: `Use the "Request a feature" pill at the bottom of the dashboard any time…` | NEUTRAL | **Stale**: the pill moved into the left sidebar (Section E) |
| `components/PageInfo.tsx` | 48 | `A weekly snapshot of every post across the 205 tracked five-star hotels that beat its own hotel's usual engagement this week…` | ALIVE | Weekly framing; "205" conflicts with 200+/400+ elsewhere (Section E) |
| `components/PageInfo.tsx` | 49 | `Every Monday we scrape the latest posts…` | ALIVE | Cadence with a named day — honesty flag in Section E; also "scrape" jargon |
| `components/PageInfo.tsx` | 58 | `A refreshed ideas library — see exactly which posts are working right now…` | NEUTRAL | "library" softened by "refreshed" and "right now" — acceptable but "feed" would be safer |
| `components/PageInfo.tsx` | 90 | Saved: `Your personal shortlist of what's worth borrowing, without scrolling the full list again.` | NEUTRAL | Personal collection is fine — it's the user's, not the product's |
| `components/PageInfo.tsx` | 98 | Watchlist: `…and their breakouts surface first on your dashboard.` | ALIVE | Recurring payoff named |

### Gated app — Saved / Watchlist

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `app/saved/page.tsx` | 22 | Eyebrow: `Your library` | **ARCHIVE** | The gated area's own information architecture labels a whole zone "library". Even as a *personal* library, the word normalises the archive mental model — and it's the eyebrow over two pages |
| `app/saved/page.tsx` | 24 | `Keep the breakout posts worth coming back to — your own swipe file of proven ideas.` | NEUTRAL | "worth coming back to" helps; a personal swipe file is legitimately the user's own archive |
| `app/saved/page.tsx` | 33–34 | `Nothing saved yet` / `Bookmark any breakout post from the dashboard and it lands here — your own library of ideas that are proven to work.` | NEUTRAL | Personal-library framing acceptable; but the empty state gives no weekly hook (Section D) |
| `app/saved/page.tsx` | 36 | CTA: `Browse breakouts` | **ARCHIVE** | A button, read at the moment the user has nothing saved and is deciding what this product is. "Browse" = wander the collection. Should send them to *this week* |
| `components/SavedPostsList.tsx` | 27–29 | `You've cleared your saved posts. Browse breakouts ↗` | **ARCHIVE** | Same verb, same problem |
| `app/watchlist/page.tsx` | 49 | Eyebrow: `Your library` | **ARCHIVE** | As above — and doubly odd over a *watchlist*, which is inherently about the future |
| `app/watchlist/page.tsx` | 51 | `Follow the hotels you most want to learn from and keep their best content close.` | NEUTRAL | — |
| `app/watchlist/page.tsx` | 61–63 | `Your watchlist is empty` / `Follow any hotel from the leaderboard and it lands here — track the accounts you most want to learn from in one place.` | NEUTRAL | Misses the recurring payoff that Dashboard's own watchlist panel states ("surface here first, every week") — Section D |
| `app/watchlist/page.tsx` | 64 | CTA: `Open the leaderboard` | NEUTRAL | "Open" is fine |
| `components/WatchlistTable.tsx` | 28–29 | `You've cleared your watchlist. Open the leaderboard ↗` | NEUTRAL | — |

### Gated app — Your Hotel / account / states

| File | Line | Current copy (verbatim) | Verdict | Why |
|---|---|---|---|---|
| `components/YourHotel.tsx` | 143 | `Last updated {date} · {n} posts · full history since {year}` | ALIVE | Update stamp |
| `components/YourHotel.tsx` | 981–987 | `Your breakouts / The posts that beat your own average … This is your signal — do more of these.` | NEUTRAL | Own-mirror page; recurrence not its job |
| `components/YourHotel.tsx` | 1026–1029 | `Notice the bar climbing: your average post now earns roughly 5× what it did in 2021…` | NEUTRAL | Demo-data narrative |
| `components/YourHotel.tsx` | 1062–1070 | Honesty footnote (public data, no rankings) | NEUTRAL | Good honesty pattern |
| `app/profile/page.tsx` | 21 | `Your details for Content Radar. Your name and hotel help us tailor what you see.` | NEUTRAL | — |
| `app/settings/page.tsx` | 58 | `Your membership and billing.` | NEUTRAL | The membership card never restates what the £39 buys each week (Section D) |
| `app/error.tsx` | 27–31 | `The radar is momentarily offline.` / `We couldn't reach the data this time…` | NEUTRAL | On-brand error |
| `app/loading.tsx` | 18 | `Scanning the portfolio…` | ALIVE | Live-scan framing, even while loading |
| `components/AppShell.tsx` | 91–94, 335–339 | Sidebar labels: `This week` / `Top posts` / `What's working` / `Leaderboard` / `Your hotel` / `Saved` / `Watchlist` / `Settings` | ALIVE | Leading with "This week" as the first nav item is exactly right |
| `components/AppShell.tsx` | 384–388 | `Help shape Content Radar` / `Request a feature →` | ALIVE | Product-in-motion signal |

---

## Section C — The top 10 (worst first)

1. **[Landing.tsx:493](hotel-dashboard/components/Landing.tsx:493)** — `02 · the library — The 30-Day & All-Time Hall of Fame … A permanent library to draw from.`
   **Why it hurts:** A quarter of the "What you get" grid — the section a buyer reads to decide what they're paying for — is explicitly branded "the library" and sold as **permanent**. "Permanent" is the anti-subscription word: it tells the buyer the value survives cancellation (screenshot it and go).
   **Suggested replacement:** `02 · the back catalogue that keeps growing — Every Breakout, Since Tracking Began: Every week's winners roll into the 30-day and all-time views — a record that gets deeper every Monday you're a member.`

2. **[Landing.tsx:432](hotel-dashboard/components/Landing.tsx:432)** — `Enjoy an exhaustive library of the industry's best-performing content ideas — ranked best-first…`
   **Why it hurts:** This is step 3 of How-it-works — the payoff. "Exhaustive" literally promises completeness: a thing you can finish in a weekend. It contradicts the step's own title ("New inspiration every week").
   **Suggested replacement:** `Fresh proven ideas land every week — ranked best-first and ready to adapt for your own hotel's feed before your competitors have seen them.`

3. **[Landing.tsx:409](hotel-dashboard/components/Landing.tsx:409)** — `See every breakout this week — plus the last 30 days and the all-time Hall of Fame.`
   **Why it hurts:** This is the single lock-overlay line — the conversion gate. The sentence ends on the archive, so the last impression before "start your free trial" is a finite collection.
   **Suggested replacement:** `See every breakout this week — and a fresh set every week after. (The 30-day and all-time views come too.)`

4. **[Landing.tsx:445](hotel-dashboard/components/Landing.tsx:445)** — `Browse three ways`
   **Why it hurts:** Elevates browsing — the archive behaviour — to the product's headline interaction, directly under the How-it-works steps.
   **Suggested replacement:** `This week first — then zoom out` (with the same three chips).

5. **[Landing.tsx:449](hotel-dashboard/components/Landing.tsx:449)** — `All time · the Hall of Fame`
   **Why it hurts:** Gives the archive a brand name while the weekly view gets a plain descriptor. Users remember named things — they'll come for "the Hall of Fame" once, not for Tuesday.
   **Suggested replacement:** `All time · every winner since tracking began` (keep "Hall of Fame" out of first-touch copy, or reserve it for inside the app).

6. **[app/saved/page.tsx:22](hotel-dashboard/app/saved/page.tsx:22) + [app/watchlist/page.tsx:49](hotel-dashboard/app/watchlist/page.tsx:49)** — eyebrow `Your library` on both pages
   **Why it hurts:** The gated app's own information architecture teaches members to think of Content Radar as a library. It's the section label they see every visit.
   **Suggested replacement:** `Your radar` (on-brand, forward-looking) or simply `Yours`.

7. **[app/saved/page.tsx:36](hotel-dashboard/app/saved/page.tsx:36)** — empty-state CTA `Browse breakouts`
   **Why it hurts:** Read at the exact moment a new trialist has saved nothing and is deciding what this product is for. The brief's own point: a button that says "Browse the library" does more damage than a paragraph.
   **Suggested replacement:** `See this week's breakouts`.

8. **[app/how-it-works/page.tsx:189](hotel-dashboard/app/how-it-works/page.tsx:189)** — `…the biggest possible library of ideas that have already proven themselves.`
   **Why it hurts:** The dedicated explainer page teaches "widen the window when you want the library" — depth as the point, freshness as a footnote. The rescue clause ("refreshed every week, so it never runs dry") is good and should lead, not trail.
   **Suggested replacement:** `Start on 7 days for the week just gone. It's refreshed every week, so it never runs dry — and when you want a deeper well of proven ideas, widen to 30 days or all time.`

9. **[components/SavedPostsList.tsx:29](hotel-dashboard/components/SavedPostsList.tsx:29)** — `You've cleared your saved posts. Browse breakouts ↗`
   **Why it hurts:** Same verb at the same kind of decision moment as #7.
   **Suggested replacement:** `You've cleared your saved posts. See this week's breakouts ↗`

10. **[components/Dashboard.tsx:266](hotel-dashboard/components/Dashboard.tsx:266)** — `Browse the leaderboard →`
    **Why it hurts:** Lowest severity of the ten, but it's the CTA out of the overview's watchlist empty state — a first-week moment. The line above it ("their breakouts surface here first, every week") is model copy; the button then undercuts the verb.
    **Suggested replacement:** `Pick hotels to follow →`

---

## Section D — What's missing (recurrence copy that should exist but doesn't)

1. **The dashboard hero has no "since you were last here."** It says *this week's* count (good) but never *what's new for you* — no "12 new breakouts since your last visit", no "next scan lands Monday". The `Updated weekly · {date}` footer note is the only forward-looking timestamp, and it's in the footer. The hero is the place to say **when the next delivery arrives**.

2. **The welcome overlay never mentions the weekly rhythm.** Four steps ([WelcomeOverlay.tsx:14–35](hotel-dashboard/components/WelcomeOverlay.tsx:14)) cover the metric, the toggle, the leaderboard, and support — and not one says "new breakouts land every Monday, come back then." This is the single highest-leverage missing sentence in the product: it's read once, at the exact moment a trialist forms their mental model. Step 4 ("Need a hand?") could become step 5, with a new step 4: *"Come back Monday — the radar re-scans every week, and this page will be new again."*

3. **The empty states end dead.** `Nothing saved yet` ([saved/page.tsx:33](hotel-dashboard/app/saved/page.tsx:33)), `Your watchlist is empty` ([watchlist/page.tsx:61](hotel-dashboard/app/watchlist/page.tsx:61)), and both ContentRadar zero-post states ([ContentRadar.tsx:749–751](hotel-dashboard/components/ContentRadar.tsx:749)) describe absence without a return reason. The Dashboard's own watchlist panel shows the fix ("their breakouts surface here first, every week") — the standalone Watchlist page should say the same, and the 7-day zero-state should say when the next scan lands.

4. **The pricing card sells price mechanics, not a recurring benefit.** The three ticks ([Landing.tsx:517–519](hotel-dashboard/components/Landing.tsx:517)) are "Fixed forever", "14-day free trial", "Cancel anytime" — all about the *charge*, none about what arrives monthly for it. One tick should be the product: *"New breakouts every week — fresh the whole time you're a member."* Same gap on Settings' Membership card ([settings/page.tsx:63](hotel-dashboard/app/settings/page.tsx:63)): "Your current plan and status" never restates what the plan delivers.

5. **The subscribe (lapsed-member) page is the churn moment with zero recurrence copy.** ([subscribe/page.tsx:40](hotel-dashboard/app/subscribe/page.tsx:40)) tells a lapsed member to "get back into the dashboard" — a place. It should tell them what they've missed and what's arriving: *"The radar hasn't stopped — {n} new breakouts have landed since your trial ended. Restart to catch up and get every week from here."* (Even a static version without the live count beats the current line.)

6. **The footer strapline and metadata skip the cadence.** `Viral hotel content, in your pocket.` ([Landing.tsx:577](hotel-dashboard/components/Landing.tsx:577)) and the global meta description ([layout.tsx:26](hotel-dashboard/app/layout.tsx:26)) both have room for "every week" and don't use it. Cheap wins: *"Viral hotel content, every week, in your pocket."*

7. **Saved cards don't age.** A member's swipe file will silently go stale; a small "saved 3 weeks ago — see what's beaten it since" affordance would convert the personal archive back into a reason to open the weekly feed. (Product suggestion, not just copy — noting it here as the recommendation this audit is allowed to make.)

---

## Section E — Honest limits (where recurrence copy would over-promise)

1. **"Every Monday" is a promise the pipeline doesn't automatically keep.** [Landing.tsx:425](hotel-dashboard/components/Landing.tsx:425) ("to your dashboard, every Monday") and [PageInfo.tsx:49](hotel-dashboard/components/PageInfo.tsx:49) ("Every Monday we scrape") name a specific day, but the scrape is run **manually** (per `hotel-dashboard/CLAUDE.md`: "You run it manually to scrape and upload data"). If a Monday is missed, the dashboard's own `week_ending` date (derived from the data, not the calendar) will visibly contradict the copy. Either automate the Monday run before keeping this copy, or soften to "every week".

2. **"More hotels and more ranking lists added every week" is not backed by a weekly process.** [Landing.tsx:471](hotel-dashboard/components/Landing.tsx:471), [548–549](hotel-dashboard/components/Landing.tsx:548). Tracked-hotel expansion is a manual SQL step (`setup-tracked.sql`), and list coverage (Michelin Keys is UK & Ireland only; W50B partial) grows in batches, not weekly. "More added regularly, building toward 1,000+" is the honest version — the FAQ's "gets better the longer you're a member" argument survives intact without the weekly claim.

3. **The 7-day view can legitimately be empty.** `ContentRadar.tsx` ships a zero-breakout state ([:749](hotel-dashboard/components/ContentRadar.tsx:749)), and `Dashboard.tsx` a zero-hero ([:383](hotel-dashboard/components/Dashboard.tsx:383)) — so any strengthened copy must promise the **scan**, not the **breakouts**: "we scan every week" is always true; "new breakouts every week" is not guaranteed. Recommended recurrence phrasing throughout: *fresh scan / new winners surfaced weekly*, never *guaranteed new posts*.

4. **Hotel-count claims disagree with each other and with the data.** The hero says **"400+"** ([Landing.tsx:334](hotel-dashboard/components/Landing.tsx:334)); How-it-works step 1 and the FAQ say **"200+"** ([:430](hotel-dashboard/components/Landing.tsx:430), [:548](hotel-dashboard/components/Landing.tsx:548)); PageInfo says **"205 tracked"** ([PageInfo.tsx:48](hotel-dashboard/components/PageInfo.tsx:48)); the live panels render `data.hotel_count` (~200+ tracked; 465 exist in the DB but only ~205 are tracked/shown). The 400+ claim appears to count untracked DB rows the member will never see. Recommend standardising on the live tracked figure everywhere.

5. **Pricing discrepancy (as the brief asked):** the STATE note records a **£40/month Stripe price** vs founding-member copy. What's actually in the repo:
   - **Landing page: £39/month** — `FOUNDING_PRICE = 39` ([Landing.tsx:14](hotel-dashboard/components/Landing.tsx:14)), rendered in the pricing card ([:511](hotel-dashboard/components/Landing.tsx:511)) and both CTA sublines ([:21](hotel-dashboard/components/Landing.tsx:21)).
   - **TrialSignupForm (dormant Stripe-checkout mode): "14 days free, then £40/month"** ([TrialSignupForm.tsx:82](hotel-dashboard/components/TrialSignupForm.tsx:82)).
   - The actual Stripe amount isn't readable from the repo (only `STRIPE_PRICE_ID` in env). So the visible conflict today is **£39 (landing) vs £40 (checkout form)** — and neither matches the £49 the brief mentions. Whichever is correct, three numbers exist in the system; when Stripe mode is re-enabled, a member could see £39 on the landing page and £40 at the capture step. **Not changed — reporting only.**

6. **Two stale factual lines found in passing** (accuracy, not archive-vs-alive, but they'd undermine trust in any refreshed copy):
   - [WelcomeOverlay.tsx:28](hotel-dashboard/components/WelcomeOverlay.tsx:28) still describes the leaderboard as "average across each hotel's last 30 posts" — the leaderboard now ranks by the day-window engagement rate (30/90-day total ÷ followers, per the toggle).
   - [WelcomeOverlay.tsx:33](hotel-dashboard/components/WelcomeOverlay.tsx:33) points to "the 'Request a feature' pill at the bottom of the dashboard" — that control now lives in the left sidebar.

---

*Read-only audit. No code, data, styling, or deployment was changed. The only file created is this report.*

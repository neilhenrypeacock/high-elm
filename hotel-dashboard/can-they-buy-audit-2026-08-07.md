# Can they buy? — front-door audit, 7 August 2026

**Status: PART ONE OF TWO.** Everything reachable without a card or a login has
been walked. The paid half — checkout, `/welcome`, the first-run dashboard and
the empty states — is **not yet tested**; Neil runs that tomorrow. Section 6
says exactly what remains unproven.

**Nothing was changed.** No code edit, no commit, no branch, no PR, no deploy, no
database write, no schema change, no Apify call, no AI backfill. `lib/data.ts`
was read and never edited. This file is the only thing added.

---

## 1. The verdict

**Close — and closer than when this was first written.**

*Updated after PR #96 and PR #97 both merged. Between them they closed the one
blocker that was a defect and three of the seven friction items. What follows is
current as of the evening of 7 August.*

The machinery is sound. The access gate holds on every gated route with zero
data leakage, the money path was proven end to end with a real card on 6 August,
the first screen a new member lands on has 19 genuine breakout posts rather than
the near-empty week that was feared, and the insight writing is genuinely good.
This is not a product that needs rebuilding.

Two things sat in the shop window, and one is gone. The **dead Privacy Policy and
Terms of Service links** on the one page cold traffic actually lands on are
**fixed, merged and live** (B2, PR #97 — verified serving from production, zero
`href="#"` left). Alongside it, PR #96 tightened the cadence claim, labelled the
value stack as illustrative, and made the page name the same three lists in every
place it names lists.

Two items remain, and neither is a defect:

- **B3 — the page contradicts itself on hotel count**, "400+" against a live
  "204+ hotels tracked". A commercial decision, not a bug: change the copy, or
  raise the tracked set and make the copy true.
- **B4 — the mobile nav CTA appears clipped** at 375px. Needs ten seconds on a
  real phone to confirm or kill before anyone spends time on it.

**The front door is good enough to point cold traffic at once B3 is decided
either way.** That verdict is provisional on the paid half, which is walked
tomorrow — and "can they buy?" cannot be answered honestly until it is.

---

## 2. Blockers

### B1 — Michelin Keys: CLOSED, Neil's decision

**Not a finding. Raised in error and withdrawn.**

The Michelin Keys chips stay on the landing page. Neil's settled decision, made
before this session and recorded in the 7 August claims audit: the gap is being
closed by **tracking more Michelin hotels**, not by removing the chip. This audit
re-raised it as a blocker anyway, which it should not have done.

No action. Not to be re-raised.

### B2 — Dead Privacy Policy and Terms of Service links on the landing page

All four footer links in the Company and Legal columns are `href="#"`:
**High Elm Studio**, **Contact**, **Privacy Policy**, **Terms of Service** —
[Landing.tsx:888-890](components/Landing.tsx:888). Confirmed dead in the live
DOM, not just the source.

`/privacy` and `/terms` **exist and render correctly** (verified — real policy
text, last updated 15 July 2026), and every *other* public page links to them
properly via `PublicChrome`. It is only the landing page, and the landing page is
the one cold traffic lands on.

For a product taking card details from business customers, unreachable legal
terms is worse than a broken link — it's the page a cautious buyer checks before
entering a card.

**FIXED in this session, on Neil's instruction.** One line in
[components/Landing.tsx:889-890](components/Landing.tsx:889):

- Privacy Policy → `/privacy`
- Terms of Service → `/terms`
- High Elm Studio → `https://highelmstudio.com`
- Contact → `mailto:neil@highelmstudio.com`

The two destinations that weren't already obvious were taken from existing
precedent rather than invented: `neil@highelmstudio.com` is what
`PublicChrome.tsx:190` already renders as the public footer contact and what both
legal pages name, and `highelmstudio.com` is the agency site (GitHub Pages, per
the root `CLAUDE.md`). Kept as plain `<a>` elements to match the sibling
`Start free trial` link in the same array, same tab, no `target`.

⚠ **Confirm the High Elm Studio URL is the one you want** — it was the only
destination with no in-repo precedent.

### B3 — The page contradicts itself on hotel count, in one screen

The hero says **"We watch every post from 400+ of the world's best hotels."**
The live stat band directly beneath renders **"204+ hotels tracked"**. Both are
visible without scrolling far. `400+` appears six times, including the FAQ's
"400+ today" and the value stack's "Competitor & benchmark tracking, 400+ elite
hotels".

A prospect doesn't need to check anything — the smaller number is the one the
software computed, and it's right there.

Two ways out, and it's a commercial decision, not a technical one:

- **Change the copy** to "nearly 200" and lean on the stronger verified claim:
  every tracked hotel is on Forbes Five-Star, the Condé Nast Gold List or The
  World's 50 Best (200 of 203 verified; all 203 on at least one named list).
- **Raise the tracked set to 400+** before outreach, making the copy true. This
  is the stated plan, but it is **blocked on the Apify $40/month cap** — 400
  hotels costs ~$43/month ongoing, so it needs a plan upgrade first.

The non-negotiable part is that the page stops contradicting itself.

### B4 — The primary CTA is clipped at phone width

At 375px the nav's **"start free trial"** button is 133px wide and extends to
x=428 — **53px past the viewport edge**, clipped by an ancestor with
`overflow-x: hidden` rather than scrolling. The logo also wraps to two lines.
There is no hamburger menu; the nav simply doesn't adapt.

The page body itself is fine — no horizontal scroll, no overflow offenders — and
there are five more "start your free trial" CTAs further down, so a motivated
visitor can still convert. But the top-right button is the most prominent thing
on the first mobile screen, and a visibly cut-off button reads as *broken site*
at the exact moment you're asking for trust.

Cold email is opened predominantly on phones, so this is where the traffic lands.

**Smallest fix:** a mobile breakpoint on the nav — collapse to the logo plus a
single CTA, or shorten the label. Touches the nav block in
[components/Landing.tsx](components/Landing.tsx) (~line 394-412).

⚠ **Confirm this on a real phone before acting.** It was measured in an emulated
375px viewport, and that pane misbehaved earlier in the session (see §5). The
measurement is a straightforward layout fact and I believe it, but it is one
browser.

---

## 3. Friction

### Still open

Ordered by how much trust each costs.

1. **`/start-trial` never mentions the card.** It says *"Create your account and
   confirm your email — then you'll start your 14-day free trial and drop
   straight into the dashboard"*, and the sub-line reads *"We'll email you a link
   to confirm your address · 14-day free trial"*. The landing page is honest
   about "card required"; the actual signup page isn't, and the card wall then
   arrives unannounced after the user has already committed effort. One clause
   fixes it.

2. **Half the first screen has no explanation.** 10 of the 19 current 7-day
   breakouts carry a written insight (~53%). The copy now correctly says "the
   strongest breakouts", so this isn't a false claim — but a new member's first
   impression is a coin flip on whether any given card explains itself.

3. **"TikTok and YouTube tracking, September 2026"** appears twice. September is
   four weeks away and there's no evidence the work has started. A date missed
   with a founding member watching is expensive — commit or soften.

4. **"20 of 20 places left"** is honestly computed and correct. Just be aware it
   also tells an attentive reader that nobody has bought yet.

### Closed by PR #96, after this audit was written

`fix/smaller-copy-claims` (merged `8c4f596`, immediately before the footer fix)
resolved three items this audit had listed as open. **All three verified live in
production**, not just in the diff:

| Was | Now | Verified |
|---|---|---|
| **"Every Monday"** claimed four times while the data lands Tuesday | **"every week"** / "ten minutes a week" / "Every week we scrape" | Zero occurrences of "every Monday" remain on the page |
| **The £1,800 value stack** rendered struck-through prices with no indication they were estimates | Carries the line **"Illustrative agency and tool costs, for comparison — not prices we charge"** | Present once, under the stack |
| **"Why believe it" named only two lists** while the chip row named four | Names **Condé Nast Gold List, Forbes Five-Star and The World's 50 Best Hotels**, plus "Not one is an account we picked at random". The FAQ answer was updated to match | Both band and FAQ confirmed; World's 50 Best appears twice |

The FAQ also softened *"more respected lists added weekly"* to *"added as we
verify them"* — a smaller promise, and the right direction.

*Two "Monday" strings do survive on the page. Both are in the What's Working
payload — "Monday is the quietest day", "median engagement per post vs Monday".
That is a finding about when hotels post, not a promise about when data arrives,
and it should stay.*

---

## 4. Cosmetic

- The landing page renders a brief "Scanning the portfolio…" fallback
  (`app/loading.tsx`) before content streams in. Normal Next.js behaviour and it
  carries a sensible defensive `[data-reveal]{opacity:1!important}` override so
  the scroll-reveal animation can't strand content invisible. No action.
- `hotelcontentradar.com` redirects to `www.` correctly.

---

## 5. What a new customer sees on their first screen

**Before signup** — the landing page, cold, no cookies:

- TTFB **~190–230ms** by direct request; full document **456KB**. In-browser
  navigation measured TTFB 519ms / load 557ms on a warm ISR cache. Page is ISR
  cached at 1 hour, so figures can lag reality by up to an hour.
- Above the fold: the hero claim, "14 days free · card required · cancel any
  time", the founding-price line, and three live breakout cards (Hotel Castello
  di Reschio 27.3×, The Savoy 23.5×, Estelle Manor 22.0×).
- Live stat band reads **20 breakouts this week · 204+ hotels tracked ·
  45 countries · 6,559 posts analysed**. (The 20 is the cached figure; a direct
  recomputation against live data gives **19** — an ISR lag, not an error.)
- The taster renders **3** posts, and the copy now correctly promises "this
  week's best-performing posts" rather than ten. The closing CTA correctly
  describes the real journey including the card. **Claims-audit items 2 and 3
  are confirmed fixed and live.**

**The first paid screen — not yet observed.** Pending tomorrow.

What is known about it from the data, independent of the UI: the default Last 7
days view will hold **19 genuine breakout posts** — comfortably above the
5-card near-miss floor, so no top-up filler is needed. Newest post **4 August**,
three days old. The publish gate (`publish_cutoff` 2026-08-05T09:36:52Z) is
currently withholding **nothing**.

**The feared empty-first-screen risk is not live right now.** It remains a real
structural exposure — the near-miss safety net exists because a week genuinely
can fall to near-zero breakouts, as happened the week of 27 July — but this week
is healthy.

⚠ **The brief's premise that `/dashboard` is uncached is out of date.** PR #87,
*"Cache the member view instead of recomputing it every page load"*, merged
5 August. Cold-load timing should be re-measured tomorrow against the cached
implementation rather than the 31 July finding.

---

## 6. Go-live record

**Nothing was changed in this session.** No env var, no Stripe setting, no
deploy, no database write.

**Stripe was already live before this session began** — the brief's premise that
the product sits in test mode is out of date by two days. Established from
`docs/HANDOFF-2026-08-06.md`, the git log, and session memory:

| Item | State | Evidence |
|---|---|---|
| Account activation | `charges_enabled: true`, `payouts_enabled: true` | Handoff, 6 Aug |
| Live price IDs | Founding + standard, both created and wired | Handoff, 6 Aug |
| Live webhook | Endpoint live, Snapshot payloads, exactly the 3 required events | Handoff, 6 Aug |
| Webhook secret | Was **absent entirely**; `STRIPE_SECRET_KEY` held a live key from a **different Stripe account**. Both fixed, key rotated, redeployed | Handoff, 6 Aug |
| Real transaction | Real card → `subscriptions` row written by the live webhook → status `trialing` | Memory, 6 Aug |
| Self-serve cancellation | Member cancelled via hosted Customer Portal; `customer.subscription.updated` fired and updated the row | Memory, 6 Aug |

So the classic trap this session was written to catch — a live webhook pointed at
a test signing secret — **was already found and fixed on 6 August**, and the
proof is that only the webhook writes the Stripe IDs that appeared on the row.

### Proven this session (read-only)

- **The access gate holds completely.** `/dashboard`, `/admin`, `/hotel`,
  `/saved`, `/watchlist`, `/profile`, `/settings` all return a ~10.8KB shell
  carrying `NEXT_REDIRECT;replace;/login;307` to a logged-out request. **Zero
  hotel data in the payload** — the only `@`-strings present are the CSS
  at-rules `@media` and `@keyframes`.
- **`/hotel` is now gated.** The brief's "still reachable by direct URL" is
  stale — [app/hotel/page.tsx:17](app/hotel/page.tsx:17) calls
  `requireActiveUser()`. The fictional Lansmere data is not publicly reachable.
- **`/admin` gets no bypass** — `requireAdminUser()` runs the full member gate
  first, then the admin allowlist.
- **`/subscribe` → `/start-trial`** redirect confirmed.
- **The dev auth bypass cannot open the live gate** — guarded on
  `NODE_ENV !== 'production'` *and* `DISABLE_DASHBOARD_AUTH === 'true'`.
- **All 6 trial CTAs point to `/start-trial`;** all 4 anchor links (`#pricing`,
  `#how-it-works`, `#faq`) resolve to real targets. The only dead links are the
  four in §2 B2.
- `/privacy`, `/terms`, `/how-it-works`, `/about` all render with real content.

### Still not confirmed

- Statement descriptor reads "Hotel Content Radar" — **not checked** (Stripe
  dashboard, Neil's).
- Trial length in Stripe matches the 14 days the page promises — **not checked**
  against the live price object.
- Everything downstream of checkout (see §7).

---

## 7. Neil's checklist

### Tomorrow — the live trial run

A live-mode trial checkout charges **£0 today**: 14 days free, card required.
Same as the 6 August run. Cancel before day 14 and no money moves.

1. Open a private/incognito window. Go to
   **https://www.hotelcontentradar.com** — check the page renders and, if you're
   on your phone, **look at the top-right "start free trial" button** (this is
   B4). *Expected: on desktop, fine. On phone, the button may be cut off at the
   right edge.*
2. Click **start free trial** → you land on `/start-trial`.
3. Sign up with an obviously-disposable address you control, e.g.
   `neil+radartest1@…`. *Expected: "We'll email you a link to confirm your address."*
4. **Time how long the confirmation email takes**, and note the sender address.
   *Expected: from `hello@hotelcontentradar.com` via Resend, within a minute.*
5. Click the link. *Expected: lands via `/auth/callback`, logged in, back at
   `/start-trial` — now showing a checkout button rather than the signup form.*
6. Start checkout. **Before paying, screenshot the Stripe page** and check:
   the price reads **£49**, the trial reads **14 days**, and the business name
   shown is **Hotel Content Radar**. *This is the statement-descriptor and
   trial-length check.*
7. Pay with your own card. *Expected: redirect to `/welcome`, which waits for the
   webhook, then lets you into `/dashboard`.*
8. **Screenshot the first dashboard screen**, welcome overlay included. Note how
   long it takes to load from cold.
9. Visit `/saved`, `/watchlist`, `/profile`, `/settings` and screenshot each
   empty state.
10. From `/settings`, open the billing portal and **cancel**. *Expected: Stripe's
    hosted portal opens, cancellation succeeds, and the `subscriptions` row
    flips status.*

Send me the screenshots and timings and I'll finish sections 3–5 and give you
the final verdict.

### Also needs you, in a dashboard

11. **Nothing on Supabase Auth.** The three toggles the brief asks about were
    **already verified done on 6 August**: Confirm email **ON**, the redirect
    allow-list carries both `/auth/callback` and `/auth/new-password`, and both
    the Confirm signup and Reset password templates point at
    `/auth/callback?token_hash={{ .TokenHash }}&type=…`. No action.
12. **Decide B3** — raise the tracked set to 400+, or change the copy to "nearly
    200". If raising: the Apify plan needs upgrading past the **$40/month cap**
    first, since 400 hotels runs ~$43/month.
13. **Decide the TikTok/YouTube September date** — commit or soften.

### Watch out for

- **Rate limiting will trip you.** `/api/checkout` and `/api/auth/magic-link`
  allow roughly five attempts per IP, then 429. If a step fails oddly, wait
  rather than assuming it's broken.
- ⚠ **`hotel-dashboard/.env.local` was left holding the LIVE secret key**
  alongside `DISABLE_DASHBOARD_AUTH=true`. Running the app locally in that state
  can create real subscriptions from localhost. Swap the test key back before
  any local work.

---

## 8. Test accounts created

**None.** I cannot create accounts or enter passwords, so no account was made in
this session and there is nothing here to clean up.

The account Neil creates tomorrow at step 3 should be recorded here and deleted
before launch, along with the two existing `subscriptions` rows, which are both
admin/founder emails rather than real customers.

---

## 9. Method and limits

- Live production (`https://www.hotelcontentradar.com`) walked in a clean browser
  with no cookies, plus direct HTTP requests for status codes and timings.
- Route map, link inventory and env-var names compiled from source (names only;
  no secret value was read, printed or logged).
- The 7-day figures were produced by reproducing `computeStandout` from
  `lib/data.ts` against live Supabase over read-only PostgREST `GET`s. `data.ts`
  was read, never edited. No write of any kind.

**Two limits worth stating plainly:**

1. **I cannot create accounts or type passwords.** That removes the signup
   itself, the wrong-password and unconfirmed-email cases, signing up with an
   existing email, the password-reset completion, and every logged-in page from
   what I could test. These are on Neil's checklist rather than done.

2. **The mobile finding (B4) came from one emulated viewport**, in a browser pane
   that started the session at 0×0 and produced a misleading "the page never
   renders" reading before I caught it. The B4 measurement was taken after that
   was fixed and is a plain layout fact, but it deserves a real-phone
   confirmation before anyone spends time on it.

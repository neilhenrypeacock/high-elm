# Content Radar Dashboard — Session Context

## What this repo is
A Next.js 16 app (App Router, Turbopack) that renders the High Elm Studio "Content Radar" — a weekly Instagram performance dashboard tracking ~205 tracked luxury hotels (465 in the DB). Implements the **Content Radar identity system** (design handoff bundle: identity README + DASHBOARD.md spec). The public landing page uses ISR (`revalidate = 3600`); the gated pages read auth cookies so they render dynamically per request.

**AUTH IS LIVE** (since 4 Jul 2026): `/dashboard`, `/hotel`, `/profile`, `/settings`, `/saved`, `/watchlist` all require a Supabase session + an active trial/subscription row, enforced identically via `lib/require-access.ts` (`requireActiveUser` for pages, `checkApiAccess` for API routes). The ONLY auth bypass is `DISABLE_DASHBOARD_AUTH=true`, hard-guarded to non-production. (The old `UNGATED_DEV_MODE` production flag was removed 2026-07-09 after an audit found it leaving production ungated — never reintroduce it.)

**BETA MODE — STRIPE OFF, PASSWORD AUTH ON** (since 12 Jul 2026, `STRIPE_DISABLED=true` in env — `lib/auth-mode.ts`):
- Sessions come from **email+password** (primary) or magic link (fallback/recovery). New routes: `/api/auth/signup` (create account + instant 14-day trial + sign-in; ONLY enabled while the flag is true — it hands out free trials), `/api/auth/login` (password; stays enabled in both modes), `/api/auth/password` (set/change password, session-only gate — how magic-link-era accounts add one, form on /profile). All rate-limited via `lib/rate-limit.ts`. Signup uses admin `createUser` with `email_confirm: true` — beta trade-off: the address is NOT verified.
- `/start-trial` renders the full signup form (name / hotel optional / email / password) instead of email→checkout; `/api/checkout` returns 503 while the flag is on. Stripe code stays wired for launch: remove `STRIPE_DISABLED` and the checkout flow returns.
- `hasActiveAccess` now enforces `trial_end` for rows with no `stripe_subscription_id` (beta trials have no webhook to expire them). Stripe-managed rows are still webhook-driven.
- **At launch**: remove `STRIPE_DISABLED` from Vercel env + `.env.local`, and decide what happens to beta-trial accounts (their rows are `trialing` with null Stripe ids; they'll lapse at `trial_end` and land on /subscribe → checkout).

## Companion folder
The data pipeline lives at `../instagram-pipeline/` in the SAME monorepo (one git repo at `high-elm/`). It is not part of this Next.js project's build. You run it manually to scrape and upload data; the dashboard only reads from Supabase.

## Design system (do not deviate)
> Rebranded 2026-07-04 from teal/Baloo-2 to **Aston-green / Space Grotesk**, matching the
> "Content Radar Design System" handoff bundle. The tokens below are the current truth.
- **Fonts:** Space Grotesk (500/600/700, `--font-display`) for display numerals + the "content radar" wordmark ONLY; Hanken Grotesk (`--font-body`) for everything readable AND the all-caps micro-labels. `--font-label` is aliased to `--font-body` on `<body>` in globals.css (Space Mono is gone). Inline 800 weights clamp to Space Grotesk 700 by design.
- **Green discipline:** `--signal #2E7357` (Aston racing green) = the signal (hero numeral, stat figures, bar fills, mark centre); `--signal-deep #1B4A37` for interactive/deltas/eyebrows on light; `--signal-light #7FC1A2` on dark. One or two green notes per view.
- **Tokens** live in `app/globals.css` (`--page #E7E3D9`, `--surface`, `--ink-deep #1D1B17`, `--panel-dark #232019`, `--on-dark`/`--on-dark-soft`, hairlines, bar ramp, shadows). Page bg (dashboard only) has radial green/sage glows with a 30s `crdrift` animation, gated on `prefers-reduced-motion`.
- Card radius 14; content capped at 1200px with 40px gutters (20px ≤480px).

## File structure
```
app/
  page.tsx              — PUBLIC LANDING PAGE (server, revalidate=3600); renders
                          components/Landing.tsx with the same getPortfolioData()
  dashboard/page.tsx    — the full dashboard (server, dynamic — reads auth cookies);
                          GATED via requireActiveUser(); wraps Dashboard.tsx in the
                          AppShell sidebar + WelcomeOverlay
  how-it-works/ about/  — public marketing pages (PublicChrome nav/footer)
  login/ subscribe/     — magic-link request page; shown-to-lapsed-members page
  auth/callback/        — magic-link landing (token-hash verifyOtp, PKCE fallback)
  profile/ settings/    — gated account pages (user_metadata profile; plan + Stripe portal)
  saved/ watchlist/     — gated, REAL per-user features (saved_posts / watchlist_hotels)
  hotel/page.tsx        — gated "Your Hotel" page (the member's own-hotel mirror);
                          renders components/YourHotel.tsx with EXAMPLE DATA from
                          lib/your-hotel-demo.ts (labelled "Example data" in the UI)
                          until hotel claiming + the pipeline full-history scrape land
  start-trial/page.tsx  — live email-capture step → creates the Stripe Checkout session
  api/                  — checkout, auth/magic-link, auth/logout, profile, saves,
                          watchlist, billing-portal, webhooks/stripe (signature-verified).
                          Write APIs require an ACTIVE subscription via checkApiAccess()
                          (billing-portal deliberately session-only so lapsed members can
                          fix their card)
  layout.tsx            — fonts (Space Grotesk / Hanken Grotesk), brand favicon
  error.tsx / loading.tsx — branded error + loading states
  globals.css           — all design tokens, hover/focus utilities, responsive breakpoints
components/
  Landing.tsx           — public landing page ('use client'), full rebuild 2026-07-04 to
                          the Content Radar Design System handoff: sticky nav → hero (live
                          breakout count-up + 200+/countries/posts meta) → who-it's-for →
                          credibility strip → how-it-works → LIVE TASTER (3 real breakout
                          cards, 4:5 real thumbnails, count-up multipliers + 2 blurred
                          behind one lock overlay) → dark "why believe it" → what-you-get
                          2×2 → £39 founding pricing w/ animated spots bar → FAQ → dark
                          closing CTA → footer. Reveal-on-scroll / count-ups / progress bar
                          via a single scoped IntersectionObserver effect (base markup is
                          the visible end-state, so nothing strands at opacity 0).
                          Offer constants (FOUNDING_PRICE £39, TRIAL_DAYS 14,
                          FOUNDING_CLAIMED 11) + TRIAL_HREF/LOGIN_HREF live at file top.
                          Credibility per-list "last scan" figures are still hardcoded
                          sample values (not yet surfaced per-list by getPortfolioData).
                          TASTER RULE (Neil, 2026-07-03): cards come from
                          data.landing_featured — best-performing NON-COLLAB posts of
                          the last 30 days (NOT the dashboard's 7-day standout list).
                          Collab = same post_id under >1 handle, plus the AI
                          driver_tag 'Collaboration' as a second guard.
                          NB: the taster renders its OWN OpenCard/LockedCard (NOT
                          BreakoutCard). OpenCard's 4:5 media reuses ContentRadar's
                          exported `ImageWithFallback` (framed contain + blurred backdrop),
                          so it matches the dashboard's framing. LockedCard keeps its plain
                          CSS cover background — it sits behind the paywall blur overlay,
                          so crop is invisible there.
  Dashboard.tsx         — shell: top bar + channel switcher, dark hero w/ by-the-numbers
                          panel, section rules, floating bottom nav (mailto feature pill),
                          dark footer.
  ContentRadar.tsx      — OWNS the 7d/30d/all time-window toggle (windows the list);
                          top-5 spec cards, ranks 6–25
                          table card, Show-more/less expander. BreakoutCard is exported
                          for reuse by Landing.tsx. Post images render FRAMED, not
                          cover-cropped: the shared `ImageWithFallback` shows the whole
                          image at true aspect (objectFit:contain, centred, drop-shadow)
                          over a blurred/tinted copy of itself (cover + scale(1.15) +
                          blur(28px) brightness .82) so 9:16 Reels/4:5/1:1 all keep their
                          subject in a fixed 400px box — no more sliced faces. Missing/
                          broken src still falls back to the warm MEDIA_PLACEHOLDER gradient
                          (unchanged). `blur`/`elevated` props scale the effect down for the
                          rank-6+ PostRow 64×48 thumbs (blur 10, no shadow). `ImageWithFallback`
                          is exported so Landing's taster OpenCard reuses the identical
                          framing. `TagChip` now shows a per-format leading icon
                          (Video/Reel → play triangle, Carousel → stacked frames, Photo →
                          image glyph; Other/unknown → text only).
  WhatsWorking.tsx      — holistic portfolio analysis, scoped Last-30-days / All-time
                          (period toggle): header + lede → 4-cell dark stat bar with
                          period-over-period deltas → "What we're seeing" observation
                          cards → "Best posts of the period" rows → "Supporting signals"
                          format/caption bars → day/time/frequency behind "Show more
                          detail" expander (kept by Neil's decision). Data is
                          data.whatsWorkingData (per-scope); reuses ImageWithFallback
                          (ContentRadar) for the best-post thumbnails.
  HotelTable.tsx        — functional leaderboard in the spec's 7-col grid: dark header,
                          sortable buttons w/ aria-sort, rank col, ER mini-bars, top-3 tint,
                          top-10 + view more, live search + region filter
  Lockup.tsx / MarkSvg.tsx — brand lockup (0.724/0.207/0.172 ratios, Space Mono endorsement)
  YourHotel.tsx         — "Your Hotel" page ('use client'): header strip w/ example-data
                          pill + accreditation pins → own-breakout cards (BreakoutCard
                          idiom relabelled "your typical post") → 4 dark stat tiles →
                          ONE honest benchmark line (the only comparison; no ranks) →
                          growth charts (inline SVG, full-history followers + ER) →
                          week/month comparison ("breaking out across luxury hotels" vs
                          your posts; month default, 3 best + Show-all expander) →
                          what's-working bullets → honesty footnote. Reuses
                          ImageWithFallback/TagChip/TypeIcon (ContentRadar) and
                          AccreditationPins (HotelTable) — all exported for this.
                          Data via lib/your-hotel-demo.ts (typed demo set; the interfaces
                          are the contract a future getYourHotelData() should return).
lib/
  data.ts               — ALL data fetching and computation (single function: getPortfolioData)
  supabase.ts           — data-read client: SUPABASE_ANON_KEY first (read-only via RLS,
                          supabase/rls.sql), service-role fallback; persistSession:false
  supabase-server.ts    — cookie-backed auth client (@supabase/ssr) for session reads
  require-access.ts     — THE gate: requireActiveUser (pages) + checkApiAccess (API
                          routes). Local-only DISABLE_DASHBOARD_AUTH bypass, nothing else
  subscriptions.ts      — subscriptions table access (service-role only; RLS: no policies)
  stripe.ts / magic-link.ts — lazy Stripe client; Supabase OTP sender
  saves.ts / post-key.ts — per-user Save/Watchlist reads; composite post key helper
  accreditations.ts / accreditations.generated.ts — static Forbes/Gold List/Michelin map
  format.ts             — shared fmtFollowers/fmtPostedAt/fmtDate/fmtNumber
```
Removed in the redesign: `FilteredDashboard.tsx`, `TopHotels.tsx`, the top50/30/10 filter sets, the `insights` table query, `eligible_this_week`.
Removed in the 2026-07-12 cleanup: `StandoutPosts.tsx` + `TrendPanel.tsx` (unused legacy components), the unused legacy token aliases in globals.css (`--bg`/`--card`/`--card-soft`/`--sage`/`--text-muted`; `--line-strong` kept — ManageBillingButton uses it), the stale `'Baloo 2'`/`'Space Mono'` font FALLBACK strings (now `'Space Grotesk'`/`'Hanken Grotesk'` to match the rebrand).

## Key constants (lib/data.ts)
| Constant | Value | Purpose |
|---|---|---|
| `MAX_STANDOUT_POSTS` | 25 | Default limit in computeStandout (used by the landing taster) |
| `STANDOUT_LIMIT` | 100 | Per-window cap on the Top posts list (7d rarely hits it; 30d/all-time do) |
| `LANDING_WINDOW_DAYS` | 30 | Landing taster window (best non-collab posts) |
| `OUTLIER_THRESHOLD` | 2 | Posts must hit 2× hotel median to qualify as breakout |
| `OUTLIER_WINDOW_DAYS` | 7 | The 7-day window (hero "this week" counts + default Top-posts view) |
| `RECENT_POSTS` | 30 | Shared "recent window": leaderboard ER **and** breakout baseline (unified) |
| `HOTEL_ER_POSTS` | =RECENT_POSTS | Last N posts for overall ER in leaderboard (now 30, was 12) |
| `MIN_ENGAGEMENT` | 100 | Absolute floor; posts below this are noise |
| `MIN_BASELINE_ENGAGEMENT` | 25 | Hotels with a median below this are excluded from breakouts |
| `BASELINE_POSTS` | =RECENT_POSTS | Baseline = median over the hotel's last 30 valid posts |
| `BASELINE_MIN_POSTS` | 12 | Fewer baseline posts → soft ⚠ warning (ER stays counted) |
| `WHATS_WORKING_WINDOW_DAYS` | 30 | Static window for the What's Working median charts |
| `TIME_WINDOWS` | 7d / 30d / all | Time-window options for the **Top posts** toggle (drives that list) |

## Tracked hotels (beta scope)
The dashboard shows ONLY hotels with `tracked = true` — currently the 200
most-followed (205 rows incl. shared-brand handles), set by
`../instagram-pipeline/setup-tracked.sql`. Untracked hotels stay in the DB but
are filtered out of every stat, including their posts. To expand coverage,
flip more hotels to tracked and re-run the pipeline.

## Breakout baseline method (current)
The baseline is the **median engagement (likes + comments) across the hotel's
last 30 valid posts** — count-based and recency-weighted, matching exactly what
the pipeline scrapes per run (`POSTS_PER_HOTEL = 30` in full-run.js).

## Collaboration posts (co-posts)
Collab posts are INCLUDED. An Instagram co-post shares one `post_id` but appears
on every partner's grid, so `posts` is keyed on the composite
**(post_id, instagram_handle)** — one row per grid — and the pipeline upserts
`onConflict: 'post_id,instagram_handle'`. Each copy is measured against its own
hotel's baseline, so a collab that outperforms surfaces as a breakout for the
hotel whose grid it's on. Dashboard de-dupes and keys React lists on
`post_id + '|' + instagram_handle`, NOT post_id alone. Migration:
`instagram-pipeline/setup-composite-post-key.sql` (applied to prod 2026-07-02).

**`is_collab` detection (2026-07-12):** the display-only collab tag (feed filter +
landing-taster exclusion) means TRUE Instagram Collabs ONLY — posts co-authored by
two accounts (the "X and Y" byline), which the scraper exposes as
`posts.coauthor_usernames`. It is `(coauthor_usernames?.length ?? 0) > 0`, nothing
else. By Neil's decision (2026-07-12) caption "collaboration with @…" posts and
single-grid tagged partnerships are NOT collabs — they stay in the feed and can
appear in the landing taster. The old cross-grid heuristic (`handlesByPostId`) and
the caption/AI-tag fallbacks were removed from `is_collab`; `captionSuggestsCollab`
is retained (exported, tested) as the likely basis for a future paid-partnership /
sponsored filter (the scraper has no native sponsored field). Requires the
`instagram-pipeline/setup-coauthors.sql` migration in prod BEFORE this code deploys —
the posts query lists columns explicitly, so the column must exist. Populates on the
next scrape (or a free backfill from the last Apify dataset); rows not yet re-scraped
have null `coauthor_usernames` and read as non-collab until then.

## Data notes
- `week_ending` is derived from **max(posted_at)** in the data, never the render date.
- `profile_snapshots` and `posts` are both fully paginated (1,000/page); posts deduped by post_id.
- Only the "all hotels" stat set is computed. The channel toggle (Instagram/TikTok/YouTube) is still a disabled "soon" placeholder.
- The **Top posts** list has a LIVE time-window toggle (7d / 30d / all, default 7d) built into `ContentRadar.tsx`. `getPortfolioData` precomputes the breakout list per window (`data.standout` is `Record<TimeWindow, OutlierPost[]>`); the client toggle selects one — no new query on toggle. Same breakout selection for all three windows (≥2× own median, ranked by multiplier), capped at `STANDOUT_LIMIT` (100). "All time" = the top 100 best-performing ever. The hero "X posts outperformed this week" always uses the 7-day count. Caveat: a post is judged against its hotel's *current* last-30 median, so old posts in the all-time view are compared to today's baseline.
- What's Working now has a **scope toggle** (Last 30 days / All time) — `computeWhatsWorkingData` in lib/data.ts precomputes both scopes into `data.whatsWorkingData` (`Record<'month'|'all', WhatsWorkingScope>`): per-scope format/caption/day/hour bars, a 4-cell stat bar (month = period-over-period deltas vs the previous 30 days; all-time = baselines + best multiple on record), up to 3 data-derived observation cards, and the top-5 best posts (reusing the precomputed `standout` windows). `data.whatsWorking` (single `WhatsWorkingSet`, last `WHATS_WORKING_WINDOW_DAYS`=30) is retained for the overview's "in focus" bullets. Median engagement rate here is the median *per-post* ER within the window (not the hotel-level leaderboard ER), so it can be windowed for the delta. Observation copy is derived from the data, not editorial sample text.
- ContentRadar tiers: top 5 = large cards, 6–15 always visible rows, 16–25 behind "Show more".

## Supabase tables
- `hotels` — hotel list with handles, names, regions, countries
- `profile_snapshots` — follower counts over time (one row per scrape)
- `posts` — all scraped posts (upserted on the composite `(post_id, instagram_handle)` — see the co-posts section above). `coauthor_usernames text[]` = Instagram's native co-author handles, the primary `is_collab` signal (setup-coauthors.sql).
- `standout_posts` — per-post AI insights + driver/theme tags (written by generate-insight.js, only ~16 rows as of Jul 2026)
- `insights` — legacy AI weekly prose; no longer read OR written (pipeline stopped generating it 2026-07-01; drop candidate)
- `subscriptions` — Stripe trial/payment state, email-keyed; RLS on with NO policies = service-role only
- `saved_posts` / `watchlist_hotels` — per-user Save/Watchlist; RLS keyed to auth.uid() (added 9 Jul 2026)

## Image storage
Post images are saved to the **`standout-images`** Supabase Storage bucket by the pipeline at scrape time; the permanent URL is written straight into `posts.image_url` (~95% of rows). `standout_posts.stored_image_url` takes priority when present. Remaining rows fall back to the live Instagram CDN URL (signed, expires — the branded fallback gradient shows when those die).

## Hidden like counts
Instagram hides likes on some posts/accounts — stored as `likes_count = null` (the bulk, heavily carousels) or `-1` (a few older rows). `hasVisibleLikes` in lib/data.ts excludes BOTH from every engagement calculation (ER, baseline, breakouts, What's Working). Consequence: a hotel that hides all its likes gets no ER/baseline and is invisible to breakouts.

## Build
```bash
npm run build   # type-check + production build (must pass before shipping)
npm run dev     # local dev server (preview name: hotel-dashboard, port 3000)
```

## Current state / known gaps
- **"Your Hotel" page LIVE at /hotel (merged to main 2026-07-12, PR #9):** gated own-hotel
  mirror rendering EXAMPLE DATA (The Lansmere, labelled in the UI). Next passes, in order:
  (1) pipeline full-history scrape on claim, (2) hotel claiming (user→hotel mapping) +
  getYourHotelData() in lib/data.ts, (3) swap demo → real data + live Instagram links.
- Public landing page live at `/` (2026-07-03): full marketing page with live-taster
  (top-3 real breakout cards, next 2 blurred behind one lock overlay). Copy is
  reality-adjusted (200+ hotels, no Hall of Fame/Weekly Read claims — those are listed
  as "coming"). Dashboard lives at `/dashboard` and is GATED (magic-link session +
  active subscription — see "What this repo is" above). Trial CTAs → `/start-trial`,
  which is the live email-capture step that creates a real Stripe Checkout session
  (test mode until launch).
- TikTok/YouTube channels are still disabled "soon" pills. The time-window toggle is now LIVE on the **Top posts** list (7d/30d/all, default 7d) — it replaced the old disabled placeholder. All-time is capped at the top 100.
- Floating nav has no scroll-spy (plain hash anchors, per prototype).
- Anon key + RLS are LIVE (applied 2026-07-01): `supabase/rls.sql` has been run against the project, `SUPABASE_ANON_KEY` is in `.env.local`, `keys/.env.supabase`, and Vercel production env. Verified: anon reads succeed, writes refused (42501). Vercel *preview* env doesn't have the key (CLI branch-prompt issue) — preview deploys fall back to the service-role key. Production URL: https://dashboard-one-xi-75.vercel.app (the dashboard-wisprteam alias sits behind Vercel team SSO).
- ⚠ When creating any NEW Supabase table, enable RLS on it immediately — the anon key can read/write any public table that lacks RLS.
- ESLint (`npm run lint`, flat config) and vitest (`npm test`, tests/data.test.ts) are set up — both must pass before shipping, alongside `npm run build`.
- ER flags are two-tier: hard flags (too few posts / implausible ER) null the ER out of all stats; soft flags (thin breakout baseline) only show a ⚠ next to a still-counted ER.
- **Error monitoring (added 2026-07-09):** server-side Sentry via `instrumentation.ts` (`onRequestError` catches unhandled route/page/webhook errors). Errors-only, no tracing, no client bundle changes, no next.config wrapper — fully inert until `SENTRY_DSN` is set in env.
- **Rate limiting (added 2026-07-09):** the two public POST endpoints (`/api/checkout`, `/api/auth/magic-link`) use the in-memory limiter in `lib/rate-limit.ts` (per-IP, plus per-target-email on magic links). Known serverless caveat is documented in that file; upgrade path is Vercel WAF rules or Upstash if real abuse appears.
- Dashboard is data-starved until the next Apify top-up run provides more post history (some hotels have tiny engagement medians, which inflates multipliers).

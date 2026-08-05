# Hotel Content Radar — Dashboard

Next.js 16 app (App Router) for the High Elm Studio "Content Radar": a subscription dashboard surfacing breakout Instagram posts from ~205 tracked luxury hotels. Public marketing pages at `/`, `/how-it-works`, `/about`, `/privacy`, `/terms`; the dashboard and account pages are gated behind a Supabase session (email + password sign-up with email confirmation; magic-link still works as a fallback) + an active Stripe trial/subscription.

## Pricing

`lib/pricing.ts` is the **single source of truth** for every price and seat number on the site. Two prices, only ever two: **founding £49/month** for the first **20** members (locked for life) and **standard £79/month** thereafter. Nothing else in the app writes a price by hand — the landing page, the checkout route and `scripts/stripe-setup.mjs` all read from that file.

Changing an amount there is only half the job: Stripe prices are immutable, so you must also run `node scripts/stripe-setup.mjs` and point `STRIPE_FOUNDING_PRICE_ID` / `STRIPE_STANDARD_PRICE_ID` at the new ids. Existing members keep the price they signed up to — which is what makes "locked for life" real.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

To browse the gated pages without logging in locally, set `DISABLE_DASHBOARD_AUTH=true` in `.env.local` (dev-only — it is hard-guarded off in production builds).

## Checks (all must pass before shipping)

```bash
npm run build      # type-check + production build
npm run lint       # eslint
npm test           # vitest — tests/data.test.ts covers the breakout maths
```

## Environment variables (`.env.local` — never commit; names only here)

| Variable | Used for |
|---|---|
| `SUPABASE_URL` | Supabase project |
| `SUPABASE_ANON_KEY` | Dashboard data reads (read-only via RLS — see `supabase/rls.sql`) + auth |
| `SUPABASE_SERVICE_ROLE_KEY` | `subscriptions` table only (server-side; also the fallback if the anon key is missing) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Checkout and webhook |
| `STRIPE_FOUNDING_PRICE_ID` / `STRIPE_STANDARD_PRICE_ID` | The two subscription prices (£49 founding / £79 standard). Created by `scripts/stripe-setup.mjs`; the checkout route picks between them based on `FOUNDING_OPEN` in `lib/pricing.ts`. Replaces the old single `STRIPE_PRICE_ID`. |
| `DISABLE_DASHBOARD_AUTH` | Local-dev auth bypass (inert in production) |
| `SENTRY_DSN` | Server-side error monitoring (`instrumentation.ts`); Sentry is fully inert when unset |

No key ever reaches the browser — all Supabase/Stripe calls run server-side. Values live in `../keys/` (gitignored) and in Vercel project env.

## How the data flows

`../instagram-pipeline/` (weekly GitHub Actions cron + manual runs) scrapes Instagram via Apify into Supabase. `lib/data.ts` reads it and computes every metric at request time — breakout baseline (median of each hotel's last 30 valid posts), 2× breakout threshold, leaderboard ER, What's Working. **The baseline and threshold are tuned together — do not change one without the other.** See `CLAUDE.md` for the full constant table and design system.

## Deploying

Pushes to `main` auto-deploy via Vercel (production: www.hotelcontentradar.com). Env vars are managed in the Vercel project settings.

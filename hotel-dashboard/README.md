# Hotel Content Radar — Dashboard

Next.js 16 app (App Router) for the High Elm Studio "Content Radar": a subscription dashboard surfacing breakout Instagram posts from ~205 tracked luxury hotels. Public marketing pages at `/`, `/how-it-works`, `/about`; the dashboard and account pages are gated behind a Supabase magic-link session + an active Stripe trial/subscription.

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
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | Checkout, webhook, trial price |
| `DISABLE_DASHBOARD_AUTH` | Local-dev auth bypass (inert in production) |
| `SENTRY_DSN` | Server-side error monitoring (`instrumentation.ts`); Sentry is fully inert when unset |

No key ever reaches the browser — all Supabase/Stripe calls run server-side. Values live in `../keys/` (gitignored) and in Vercel project env.

## How the data flows

`../instagram-pipeline/` (weekly GitHub Actions cron + manual runs) scrapes Instagram via Apify into Supabase. `lib/data.ts` reads it and computes every metric at request time — breakout baseline (median of each hotel's last 30 valid posts), 2× breakout threshold, leaderboard ER, What's Working. **The baseline and threshold are tuned together — do not change one without the other.** See `CLAUDE.md` for the full constant table and design system.

## Deploying

Pushes to `main` auto-deploy via Vercel (production: www.hotelcontentradar.com). Env vars are managed in the Vercel project settings.

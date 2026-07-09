import * as Sentry from '@sentry/nextjs';

// Server-side error monitoring (audit finding I2). Deliberately LEAN:
// - server/edge runtime capture only — no client bundle changes, no
//   next.config wrapper, no source-map upload step
// - inert until SENTRY_DSN is set in the environment (Vercel + .env.local),
//   so local dev and preview builds without the var behave exactly as before
// onRequestError forwards every unhandled route/page/webhook error to Sentry.
export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    // Errors only — no performance tracing (keeps the free tier roomy).
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;

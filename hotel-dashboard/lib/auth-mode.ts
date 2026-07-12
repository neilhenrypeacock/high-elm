// Beta switch: STRIPE_DISABLED=true turns off Stripe checkout and opens
// password signup with an instant 14-day trial (no card). Set in .env.local
// AND Vercel env while in development; REMOVE (or set false) at launch so the
// paid checkout flow takes over again.
//
// What flips with it:
// - /start-trial renders the account-creation form instead of email→checkout
// - /api/auth/signup is only enabled while this is true (else 403) — it
//   creates accounts with a free trial, which must never run alongside the
//   paid flow
// - /api/checkout refuses (503) while true
// Password LOGIN (/api/auth/login) stays available in both modes — accounts
// created during the beta keep working after launch.
export function stripeDisabled(): boolean {
  return process.env.STRIPE_DISABLED === 'true';
}

export const BETA_TRIAL_DAYS = 14;

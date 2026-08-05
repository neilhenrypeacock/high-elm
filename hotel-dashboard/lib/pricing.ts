// ═══════════════════════════════════════════════════════════════════════════
// PRICING — the single source of truth.
//
// Every price shown anywhere on this site is read from this file. There are
// exactly two prices and only ever two:
//
//   Founding — £49/month, for the first 20 members. Locked for life: they keep
//              paying £49 even after the price rises.
//   Standard — £79/month, for everyone from member 21 onwards.
//
// To change what Content Radar costs, change the numbers below. Nothing else
// in the app writes a price by hand.
//
// ── IMPORTANT: changing an amount here is only HALF the job ────────────────
// A Stripe price cannot be edited once it has been created. To actually charge
// a different amount you must create a NEW price in Stripe and point the app at
// it:
//
//   1. Update the number(s) below.
//   2. Run  node scripts/stripe-setup.mjs  (it creates any price that doesn't
//      exist yet and prints the ids; it never edits or deletes anything).
//   3. Put the printed ids into STRIPE_FOUNDING_PRICE_ID and
//      STRIPE_STANDARD_PRICE_ID — in .env.local locally, and in Vercel for
//      production.
//
// Anyone already subscribed carries on paying the amount they signed up to.
// That is precisely what makes the "locked for life" promise real, rather than
// something we have to remember to honour by hand.
// ═══════════════════════════════════════════════════════════════════════════

/** Founding-member price. Pence is what Stripe wants; pounds is what people read. */
export const FOUNDING_PRICE_GBP: number = 49;
export const FOUNDING_PRICE_PENCE: number = 4900;

/** Standard price, charged once the founding places are gone. */
export const STANDARD_PRICE_GBP: number = 79;
export const STANDARD_PRICE_PENCE: number = 7900;

/** Length of the free trial, in days. Card required, nothing charged. */
export const TRIAL_DAYS: number = 14;

/** How many founding places exist in total. */
export const FOUNDING_PLACES_TOTAL: number = 20;

/**
 * How many founding places have been taken.
 *
 * EDIT THIS BY HAND as members join. It is deliberately NOT counted from Stripe
 * or the database: at twenty seats a number you edit in one file is the simplest
 * thing that works, and it can never silently display a wrong figure because an
 * API call failed. Keep it honest — it is shown to the public.
 */
export const FOUNDING_PLACES_TAKEN: number = 0;

/** Places still available. */
export const FOUNDING_PLACES_LEFT: number = FOUNDING_PLACES_TOTAL - FOUNDING_PLACES_TAKEN;

/** Is founding membership still open? Drives which Stripe price checkout uses. */
export const FOUNDING_OPEN: boolean = FOUNDING_PLACES_LEFT > 0;

// ── Display strings ────────────────────────────────────────────────────────
// Pre-formatted here so no component ever formats currency itself.

export const FOUNDING_PRICE_DISPLAY = `£${FOUNDING_PRICE_GBP}`;
export const STANDARD_PRICE_DISPLAY = `£${STANDARD_PRICE_GBP}`;

export const FOUNDING_PRICE_MONTHLY = `£${FOUNDING_PRICE_GBP}/month`;
export const STANDARD_PRICE_MONTHLY = `£${STANDARD_PRICE_GBP}/month`;

/** "20 of 20 places left" — the scarcity line. */
export const PLACES_LEFT_LINE = `${FOUNDING_PLACES_LEFT} of ${FOUNDING_PLACES_TOTAL} places left`;

/** Fine print under the trial CTA. */
export const TRIAL_FINE_PRINT = `${TRIAL_DAYS} days free · card required · cancel any time`;

// ── The value stack ────────────────────────────────────────────────────────
// The "what your £49 replaces" comparison on the landing page. These are
// illustrative agency/tool costs, not anything we charge. The total is derived
// from the rows so the two can never drift apart.

export const VALUE_STACK: ReadonlyArray<{ label: string; monthlyGbp: number }> = [
  { label: 'Weekly content ideation, done for you', monthlyGbp: 400 },
  { label: '10+ hours a week looking for content inspiration', monthlyGbp: 500 },
  { label: 'Competitor & benchmark tracking, 400+ elite hotels', monthlyGbp: 400 },
  { label: 'The posting playbook — when & how often to post', monthlyGbp: 300 },
  { label: 'A permanent library of proven, top-performing posts', monthlyGbp: 200 },
];

export const VALUE_STACK_TOTAL_GBP: number = VALUE_STACK.reduce((sum, row) => sum + row.monthlyGbp, 0);

/** "£400/mo" style, for a value-stack row. */
export function monthlyCost(gbp: number): string {
  return `£${gbp.toLocaleString('en-GB')}/mo`;
}

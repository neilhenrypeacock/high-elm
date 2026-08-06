import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { adminEmails } from './admin';
import { FOUNDING_PLACES_TOTAL, placesLeftLine } from './pricing';

// ═══════════════════════════════════════════════════════════════════════════
// FOUNDING PLACES — counted from the database, not hand-edited.
//
// Two things depend on this number, and only one of them is cosmetic:
//
//   1. The public scarcity line, "N of 20 places left".
//   2. WHICH STRIPE PRICE A CUSTOMER IS CHARGED — £49 founding while places
//      remain, £79 standard once they are gone. Stripe prices are immutable,
//      so whatever a member starts on they keep for life. Getting this wrong
//      is not a display bug; it is charging the wrong amount forever.
//
// ── The counting rule ──────────────────────────────────────────────────────
//
// A place is TAKEN ONCE AND NEVER RELEASED. If a founding member cancels, or a
// trial lapses without paying, their seat does not go back on sale. That is
// Neil's decision (6 Aug 2026) and it is what makes "founding member" a status
// rather than a rolling discount.
//
// So we count rows that have EVER had a Stripe subscription, regardless of
// their current status:
//
//   stripe_subscription_id IS NOT NULL  AND  email is not a founder account
//
// `stripe_subscription_id` is the right marker because only a completed
// checkout ever sets it, and nothing ever clears it — the `deleted` webhook
// writes status='canceled' and leaves the id in place. A cancelled member is
// therefore still counted, which is exactly the intent.
//
// Founder/admin rows are excluded: Neil's own beta row and any test signup are
// not customers holding one of the twenty seats. The exclusion list is the same
// admin allowlist the access gate uses, so the two cannot drift.
//
// ── When the count cannot be read ──────────────────────────────────────────
//
// The hand-edited constant this replaced had one real virtue: it could never be
// wrong because a query failed. That concern is answered, not ignored — but the
// answer is different for each caller, because the cost of being wrong is:
//
//   Landing page → shows NO scarcity line at all. A missing line is honest; a
//                  guessed one is not. ("Prefer the smallest honest claim.")
//   Checkout     → refuses, with a logged error. Guessing here charges someone
//                  the wrong price for the life of their membership, and a
//                  failed checkout is far cheaper to recover from than that.
//
// Both callers therefore handle a throw rather than receiving a fallback number
// they cannot distinguish from a real one.
// ═══════════════════════════════════════════════════════════════════════════

export interface FoundingState {
  /** Places claimed so far, clamped to the total. */
  taken: number;
  /** Places still available. Never negative. */
  left: number;
  /** Is founding membership still open? Decides the Stripe price. */
  open: boolean;
  /** "N of 20 places left". */
  line: string;
}

// Service-role client — subscriptions has RLS enabled with no policies, so only
// this key can read it. Same reasoning as lib/subscriptions.ts.
function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/**
 * How many founding places have ever been claimed. Throws if the count cannot
 * be read — callers must decide what a missing number means for them.
 *
 * Filtering the founder accounts happens here in JS rather than in the query.
 * The table holds one row per customer, so it stays small, and an `in` filter
 * built by string-joining email addresses is the kind of thing that quietly
 * matches nothing when an address contains an unexpected character.
 */
export async function countFoundingPlacesTaken(): Promise<number> {
  const { data, error } = await getServiceClient()
    .from('subscriptions')
    .select('email')
    .not('stripe_subscription_id', 'is', null);

  if (error) throw error;

  const founders = new Set(adminEmails());
  return (data ?? []).filter((row) => !founders.has((row.email ?? '').toLowerCase())).length;
}

export function foundingStateFromCount(taken: number): FoundingState {
  // Clamped both ways. Once the twenty are gone every further member is on the
  // standard price, so the raw count keeps climbing past 20 and the public line
  // would otherwise read "-3 of 20 places left".
  const clamped = Math.min(Math.max(taken, 0), FOUNDING_PLACES_TOTAL);
  const left = FOUNDING_PLACES_TOTAL - clamped;
  return { taken: clamped, left, open: left > 0, line: placesLeftLine(left) };
}

/**
 * Invalidated by the Stripe webhook on every subscription write, so a new
 * member moves the number immediately rather than up to ten minutes later. The
 * revalidate window is a staleness ceiling for the case where a webhook is
 * missed, not the refresh mechanism.
 */
// Matched to the landing page's own `revalidate` (app/page.tsx) ON PURPOSE.
// Next.js gives a route the MINIMUM of its own revalidate and any nested cache
// lifetime, so a shorter window here silently re-runs the whole landing page —
// including the expensive portfolio query — that much more often. Set to 600
// this file quietly turned the homepage from hourly into every ten minutes.
export const FOUNDING_CACHE_TAG = 'founding-places';
export const FOUNDING_CACHE_SECONDS = 3600;

const cachedCount = unstable_cache(async () => countFoundingPlacesTaken(), ['founding-places-taken'], {
  revalidate: FOUNDING_CACHE_SECONDS,
  tags: [FOUNDING_CACHE_TAG],
});

/** Cached founding state, for the public landing page. Throws on read failure. */
export async function getFoundingState(): Promise<FoundingState> {
  return foundingStateFromCount(await cachedCount());
}

/**
 * Uncached founding state, for checkout. Deliberately not cached: this decides
 * what a customer is charged for life, and a ten-minute-stale `open` is how the
 * twenty-first member gets the founding price permanently.
 */
export async function getFoundingStateFresh(): Promise<FoundingState> {
  return foundingStateFromCount(await countFoundingPlacesTaken());
}

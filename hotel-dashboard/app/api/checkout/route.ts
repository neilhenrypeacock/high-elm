import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { allowRequest, clientIp } from '@/lib/rate-limit';
import { FOUNDING_OPEN, TRIAL_DAYS } from '@/lib/pricing';

// Starts the free trial (length from lib/pricing.ts) for the LOGGED-IN member: creates a Stripe
// Checkout Session (card required upfront, nothing charged during the trial)
// pre-filled with their account email, so the email-keyed webhook writes the
// subscriptions row against the same email as their account and the two join
// up. Returns the hosted checkout URL for the client to redirect to.
//
// Session-gated (not the subscription gate — the caller is by definition
// starting a trial and has no active sub yet). Rate-limited per IP.
export async function POST(request: NextRequest) {
  if (!allowRequest(`checkout:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a minute.' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Please log in to start your trial.' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  // Which price this member gets is decided by lib/pricing.ts: the founding
  // price while founding places remain, the standard price once they're gone.
  // Whichever they start on, they keep — Stripe prices are immutable, so a
  // founding member carries on paying the founding amount for life.
  const priceId = FOUNDING_OPEN
    ? process.env.STRIPE_FOUNDING_PRICE_ID
    : process.env.STRIPE_STANDARD_PRICE_ID;

  if (!priceId) {
    console.error(
      `Checkout price id missing: ${FOUNDING_OPEN ? 'STRIPE_FOUNDING_PRICE_ID' : 'STRIPE_STANDARD_PRICE_ID'} is not set.`,
    );
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    payment_method_collection: 'always',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    },
    success_url: `${origin}/dashboard`,
    cancel_url: `${origin}/start-trial?status=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}

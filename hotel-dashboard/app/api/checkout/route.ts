import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { allowRequest, clientIp } from '@/lib/rate-limit';

// Starts the 14-day free trial for the LOGGED-IN member: creates a Stripe
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

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    payment_method_collection: 'always',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
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

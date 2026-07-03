import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

// Creates a Stripe Checkout Session for the 14-day free trial (card required
// upfront) and returns its hosted URL for the client to redirect to.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    payment_method_collection: 'always',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
    },
    success_url: `${origin}/start-trial?status=success`,
    cancel_url: `${origin}/start-trial?status=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}

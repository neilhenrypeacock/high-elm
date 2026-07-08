import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSubscriptionByEmail } from '@/lib/subscriptions';

// Opens the Stripe Customer Portal for the signed-in member so they can manage
// their card, invoices and cancellation. We create a billing_portal.Session for
// their stored stripe_customer_id and return its URL for the client to redirect
// to. No self-serve upgrade/downgrade — this is Stripe's own hosted portal.
//
// ⚠️ The Customer Portal must be ENABLED in the Stripe Dashboard (test mode:
// Settings → Billing → Customer portal) or sessions.create throws. We surface a
// clear message in that case rather than a raw 500.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const subscription = await getSubscriptionByEmail(user.email);
  if (!subscription?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found for this email yet.' },
      { status: 404 }
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not open billing.';
    // Most common cause: the Customer Portal isn't enabled in the Stripe Dashboard.
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

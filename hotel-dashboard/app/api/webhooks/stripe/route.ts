import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { FOUNDING_CACHE_TAG } from '@/lib/founding';
import {
  updateSubscriptionByStripeId,
  upsertSubscriptionByEmail,
  type SubscriptionStatus,
} from '@/lib/subscriptions';

// Statuses the app understands. Stripe can also send e.g. 'incomplete',
// 'unpaid' or 'paused' — those are stored as-is (the status column is plain
// text) and the access gate treats anything outside trialing/active as
// inactive, but we log them so an unexpected lifecycle state is visible.
const KNOWN_STATUSES: string[] = ['trialing', 'active', 'past_due', 'canceled'];

function toStatus(raw: string, context: string): SubscriptionStatus {
  if (!KNOWN_STATUSES.includes(raw)) {
    console.error(`stripe webhook: unexpected subscription status "${raw}" (${context}) — stored raw; gate treats it as inactive`);
  }
  return raw as SubscriptionStatus;
}

// Drops the cached founding-places count and the ISR'd landing page so the
// public "N of 20 places left" reflects a sale straight away.
//
// Only checkout.session.completed calls this. A place is taken once and never
// released (lib/founding.ts), so a cancellation cannot change the count and
// there is nothing to refresh on `updated` or `deleted`.
//
// Failure here is logged and swallowed on purpose: the webhook must still
// return 200 or Stripe retries it, and the subscription row — the thing that
// actually grants access — has already been written by this point. A stale
// counter self-corrects within FOUNDING_CACHE_SECONDS.
function refreshFoundingCount() {
  try {
    revalidateTag(FOUNDING_CACHE_TAG, { expire: 0 });
    revalidatePath('/');
  } catch (err) {
    console.error('stripe webhook: could not refresh the founding-places count:', err);
  }
}

// Stripe requires the exact raw request body for signature verification —
// route handlers don't auto-parse JSON, so request.text() already gives us
// that (unlike Pages API routes, which needed bodyParser: false).
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email ?? session.customer_email;
      if (!email || !session.subscription) break;

      const subscription = await getStripe().subscriptions.retrieve(
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      );

      await upsertSubscriptionByEmail(email, {
        status: toStatus(subscription.status, `checkout.session.completed ${subscription.id}`),
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
        stripe_subscription_id: subscription.id,
      });

      // A new member has just taken a founding place, so the public counter is
      // now stale. Both the cached count and the ISR'd landing page have to be
      // invalidated — the page is revalidated hourly, and "20 of 20 places
      // left" sitting there for an hour after the first sale is exactly the
      // drift this replaced the hand-edited constant to avoid.
      refreshFoundingCount();

      // No magic link is sent here. Checkout is session-gated, so whoever
      // completed it is already logged in — the email only ever read as a
      // confusing "here's your login link" in the first minute of being a
      // paying customer.
      break;
    }

    case 'customer.subscription.updated': {
      const delivered = event.data.object as Stripe.Subscription;

      // Deliberately NOT trusting the event payload. Stripe retries failed
      // deliveries for days and guarantees no ordering, so a stale `updated`
      // (status active) can arrive after a cancellation and resurrect a
      // canceled member. Re-fetching asks Stripe what is true *now*, which
      // makes a late or duplicated event harmless — it just re-applies the
      // current state. (The checkout handler above already worked this way.)
      const subscription = await getStripe().subscriptions.retrieve(delivered.id);

      await updateSubscriptionByStripeId(subscription.id, {
        status: toStatus(subscription.status, `customer.subscription.updated ${subscription.id}`),
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionByStripeId(subscription.id, { status: 'canceled' });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

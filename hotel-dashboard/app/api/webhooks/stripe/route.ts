import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { sendMagicLink } from '@/lib/magic-link';
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

      await sendMagicLink(email, new URL(request.url).origin).catch((err) => {
        console.error('Failed to send magic link after checkout:', err);
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
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

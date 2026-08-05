import { createClient } from '@supabase/supabase-js';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Subscription {
  email: string;
  status: SubscriptionStatus;
  trial_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['trialing', 'active'];

// Service-role client — the subscriptions table has RLS enabled with no
// policies, so only this key can read or write it. Never expose this client
// or key to the browser.
function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function getSubscriptionByEmail(email: string): Promise<Subscription | null> {
  const { data, error } = await getServiceClient()
    .from('subscriptions')
    .select('email, status, trial_end, stripe_customer_id, stripe_subscription_id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

// How long a Stripe-managed `trialing` row stays valid after its trial_end
// passes. The webhook is what normally ends a trial, and Stripe retries failed
// deliveries for roughly three days — so this window absorbs ordinary lag
// without ever *trusting* the webhook indefinitely. Before this existed, a
// webhook that never arrived (outage, rotated signing secret, changed URL) meant
// the row stayed `trialing` forever and the member kept access without paying.
export const TRIAL_GRACE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// `now` is injectable so the tests can pin a clock; production always uses the
// real one.
export function hasActiveAccess(subscription: Subscription | null, now: number = Date.now()): boolean {
  if (!subscription || !ACTIVE_STATUSES.includes(subscription.status)) return false;

  // Only a trial can lapse on a date. An `active` row is ended by the webhook
  // flipping its status, which is a different failure (and a visible one — the
  // member stops being charged).
  if (subscription.status !== 'trialing' || !subscription.trial_end) return true;

  const trialEnd = new Date(subscription.trial_end).getTime();
  // An unparseable date is a data fault, not a lapsed trial — fail open rather
  // than lock out a member over a bad string.
  if (Number.isNaN(trialEnd)) return true;

  // Beta rows have no Stripe subscription, so there is no webhook that could
  // ever end them — enforce trial_end exactly. Stripe rows get the grace window.
  const grace = subscription.stripe_subscription_id ? TRIAL_GRACE_DAYS * DAY_MS : 0;
  return now < trialEnd + grace;
}

// Upsert keyed on email — the row may not exist yet (first checkout) or may
// already exist (a later subscription.updated/deleted event for the same
// customer).
export async function upsertSubscriptionByEmail(
  email: string,
  fields: Partial<Omit<Subscription, 'email'>>
) {
  const { error } = await getServiceClient()
    .from('subscriptions')
    .upsert(
      { email: email.toLowerCase(), updated_at: new Date().toISOString(), ...fields },
      { onConflict: 'email' }
    );

  if (error) throw error;
}

export async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  fields: Partial<Omit<Subscription, 'email'>>
) {
  const { data, error } = await getServiceClient()
    .from('subscriptions')
    .update({ updated_at: new Date().toISOString(), ...fields })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select('email');

  if (error) throw error;
  // A webhook event for a subscription we have no row for would otherwise
  // vanish silently — log it so a missed checkout/webhook gap is visible.
  if (!data?.length) {
    console.error(`subscriptions: no row matched stripe_subscription_id ${stripeSubscriptionId} — update dropped`);
  }
}

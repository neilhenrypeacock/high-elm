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

export function hasActiveAccess(subscription: Subscription | null): boolean {
  return !!subscription && ACTIVE_STATUSES.includes(subscription.status);
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

import Stripe from 'stripe';

let client: Stripe | null = null;

// Single Stripe client, created lazily so the key is only required at request
// time (not at build time, when env vars may not be injected yet).
export function getStripe() {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return client;
}

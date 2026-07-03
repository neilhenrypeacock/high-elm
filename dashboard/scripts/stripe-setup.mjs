// One-time setup: creates the "Content Radar" product and its £40.00/month
// recurring GBP price in Stripe (test mode). Run once:
//
//   1. Add your Stripe TEST secret key to dashboard/.env.local as STRIPE_SECRET_KEY.
//   2. node scripts/stripe-setup.mjs
//   3. Copy the printed price id into STRIPE_PRICE_ID in .env.local.
//
// Safe to re-run — it always creates a new product/price rather than mutating
// an existing one, so re-running just leaves an extra (harmless) test-mode
// product behind.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Stripe from 'stripe';

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is not set in dashboard/.env.local — add your test key first.');
  process.exit(1);
}
if (!secretKey.startsWith('sk_test_')) {
  console.error('STRIPE_SECRET_KEY does not look like a test-mode key (expected sk_test_...). Refusing to run.');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const product = await stripe.products.create({
  name: 'Content Radar',
  description: 'Weekly Instagram performance dashboard for luxury hotels.',
});

const price = await stripe.prices.create({
  product: product.id,
  currency: 'gbp',
  unit_amount: 4000, // £40.00
  recurring: { interval: 'month' },
});

console.log(`Product created: ${product.id}`);
console.log(`Price created:   ${price.id}`);
console.log('\nAdd this to dashboard/.env.local:');
console.log(`STRIPE_PRICE_ID=${price.id}`);

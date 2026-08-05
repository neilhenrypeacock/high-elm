// Creates the two Content Radar subscription prices in Stripe:
//
//   Founding — £49.00/month, for the first 20 members (locked for life)
//   Standard — £79.00/month, from member 21 onwards
//
// The amounts come from lib/pricing.ts, which is the single source of truth.
// This script only mirrors them into Stripe — it never invents a number.
//
//   1. Make sure your Stripe TEST secret key is in hotel-dashboard/.env.local
//      as STRIPE_SECRET_KEY.
//   2. node scripts/stripe-setup.mjs
//   3. Copy the two printed price ids into .env.local (and later into Vercel).
//
// SAFE TO RE-RUN. It looks for an existing product and existing prices that
// already match (same amount, GBP, monthly, active) and reuses them rather than
// creating duplicates. It never edits, archives or deletes anything — Stripe
// prices are immutable by design, and that immutability is what makes the
// "locked for life" promise real.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import Stripe from 'stripe';

const here = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(here, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
}

// Read the amounts straight out of lib/pricing.ts so the script and the site can
// never disagree. A tiny parse beats adding a TS build step to a one-off script.
const pricingSrc = fs.readFileSync(path.join(here, '..', 'lib', 'pricing.ts'), 'utf8');
function pence(name) {
  const m = pricingSrc.match(new RegExp(`export const ${name}\\s*:\\s*number\\s*=\\s*(\\d+)`));
  if (!m) {
    console.error(`Could not read ${name} from lib/pricing.ts — has the file been renamed or reformatted?`);
    process.exit(1);
  }
  return Number(m[1]);
}

const PRODUCT_NAME = 'Content Radar';
const PLANS = [
  { key: 'founding', label: 'Founding', envVar: 'STRIPE_FOUNDING_PRICE_ID', amount: pence('FOUNDING_PRICE_PENCE') },
  { key: 'standard', label: 'Standard', envVar: 'STRIPE_STANDARD_PRICE_ID', amount: pence('STANDARD_PRICE_PENCE') },
];

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is not set in hotel-dashboard/.env.local — add your test key first.');
  process.exit(1);
}
if (!secretKey.startsWith('sk_test_') && process.env.STRIPE_ALLOW_LIVE !== 'true') {
  console.error('STRIPE_SECRET_KEY does not look like a test-mode key (expected sk_test_...).');
  console.error('If you really mean to set up LIVE prices, re-run with STRIPE_ALLOW_LIVE=true.');
  process.exit(1);
}

const stripe = new Stripe(secretKey);
const mode = secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE';
console.log(`Stripe mode: ${mode}\n`);

// ── Product: reuse the existing "Content Radar" product if there is one ──────
const existingProducts = await stripe.products.list({ limit: 100, active: true });
let product = existingProducts.data.find((p) => p.name === PRODUCT_NAME);

if (product) {
  console.log(`Product reused:  ${product.id}  (${PRODUCT_NAME})`);
} else {
  product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'Weekly Instagram performance dashboard for luxury hotels.',
  });
  console.log(`Product created: ${product.id}  (${PRODUCT_NAME})`);
}

// ── Prices: reuse an exact match, otherwise create ───────────────────────────
const existingPrices = await stripe.prices.list({ product: product.id, limit: 100, active: true });
const results = [];

for (const plan of PLANS) {
  const match = existingPrices.data.find(
    (p) => p.active && p.currency === 'gbp' && p.unit_amount === plan.amount && p.recurring?.interval === 'month',
  );

  if (match) {
    console.log(`${plan.label} price reused:  ${match.id}  (£${(plan.amount / 100).toFixed(2)}/month)`);
    results.push({ ...plan, id: match.id });
    continue;
  }

  const created = await stripe.prices.create({
    product: product.id,
    currency: 'gbp',
    unit_amount: plan.amount,
    recurring: { interval: 'month' },
    nickname: `${plan.label} — £${(plan.amount / 100).toFixed(2)}/month`,
  });
  console.log(`${plan.label} price created: ${created.id}  (£${(plan.amount / 100).toFixed(2)}/month)`);
  results.push({ ...plan, id: created.id });
}

console.log('\nNothing was edited, archived or deleted.');
console.log(`\nAdd these to hotel-dashboard/.env.local, and to Vercel (${mode} values):\n`);
for (const r of results) console.log(`${r.envVar}=${r.id}`);
console.log('\nThe old single STRIPE_PRICE_ID is no longer read by the app and can be removed.');

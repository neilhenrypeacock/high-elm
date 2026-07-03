-- Run in Supabase SQL Editor
--
-- Trial signup → payment → access flow (Stripe test mode + Supabase Auth magic link).
-- Keyed on email, not just user_id — the Stripe webhook that creates/updates this row
-- fires before anyone has clicked their magic link, so email is the only identifier
-- guaranteed to exist at that point. user_id is filled in opportunistically once known.
--
-- Access to this table is service-role only (dashboard app + webhook handler). RLS is
-- enabled with NO policies, so the anon key can neither read nor write it.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  text UNIQUE NOT NULL,
  user_id                uuid,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text NOT NULL,
  trial_end              timestamptz,
  created_at             timestamptz DEFAULT now() NOT NULL,
  updated_at             timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

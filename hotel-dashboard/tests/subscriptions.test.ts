import { describe, it, expect } from 'vitest';
import { hasActiveAccess, TRIAL_GRACE_DAYS, type Subscription } from '../lib/subscriptions';

// hasActiveAccess is the paywall's only decision function: every gated page,
// every write API and the admin gate all reduce to this one boolean. It had no
// test at all until the 4 Aug review, which is how finding 4 — a Stripe trial
// that never expires if the webhook goes missing — survived unnoticed.
//
// The clock is pinned rather than mocked globally, because the function takes
// `now` for exactly this reason.
const NOW = Date.parse('2026-08-05T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function sub(fields: Partial<Subscription>): Subscription {
  return {
    email: 'member@example.com',
    status: 'active',
    trial_end: null,
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    ...fields,
  };
}

const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe('hasActiveAccess — who gets through the paywall', () => {
  const cases: Array<{ name: string; subscription: Subscription | null; expected: boolean }> = [
    { name: 'no row at all', subscription: null, expected: false },
    { name: 'canceled', subscription: sub({ status: 'canceled' }), expected: false },
    {
      name: 'past_due — strict by design: a failed card locks out now, not in N days',
      subscription: sub({ status: 'past_due' }),
      expected: false,
    },
    { name: 'active with no trial date', subscription: sub({ status: 'active' }), expected: true },
    {
      name: 'active whose old trial_end has long passed — status is what counts',
      subscription: sub({ status: 'active', trial_end: at(-90 * DAY) }),
      expected: true,
    },
    {
      name: 'Stripe trial still running',
      subscription: sub({ status: 'trialing', trial_end: at(5 * DAY) }),
      expected: true,
    },
    {
      name: 'Stripe trial one day past its end — inside the webhook grace',
      subscription: sub({ status: 'trialing', trial_end: at(-1 * DAY) }),
      expected: true,
    },
    {
      name: 'Stripe trial four days past its end — the missing-webhook case (finding 4)',
      subscription: sub({ status: 'trialing', trial_end: at(-4 * DAY) }),
      expected: false,
    },
    {
      name: 'Stripe trial exactly at the end of the grace window',
      subscription: sub({ status: 'trialing', trial_end: at(-TRIAL_GRACE_DAYS * DAY) }),
      expected: false,
    },
    {
      name: 'beta trial (no Stripe subscription) still running',
      subscription: sub({ status: 'trialing', stripe_subscription_id: null, trial_end: at(DAY) }),
      expected: true,
    },
    {
      name: 'beta trial one hour past — no webhook exists to wait for, so no grace',
      subscription: sub({
        status: 'trialing',
        stripe_subscription_id: null,
        trial_end: at(-60 * 60 * 1000),
      }),
      expected: false,
    },
    {
      name: 'trialing with no end date — nothing to enforce',
      subscription: sub({ status: 'trialing', trial_end: null }),
      expected: true,
    },
    {
      name: 'trialing with an unparseable date — a data fault must not lock a member out',
      subscription: sub({ status: 'trialing', trial_end: 'not-a-date' }),
      expected: true,
    },
  ];

  for (const { name, subscription, expected } of cases) {
    it(`${expected ? 'grants' : 'denies'} access: ${name}`, () => {
      expect(hasActiveAccess(subscription, NOW)).toBe(expected);
    });
  }

  it('keeps the grace window short enough to matter', () => {
    // Stripe retries webhook deliveries for roughly three days. A grace much
    // longer than that stops being lag-absorption and becomes free access.
    expect(TRIAL_GRACE_DAYS).toBeGreaterThan(0);
    expect(TRIAL_GRACE_DAYS).toBeLessThanOrEqual(7);
  });

  it('defaults to the real clock when none is passed', () => {
    expect(hasActiveAccess(sub({ status: 'trialing', trial_end: at(30 * DAY) }))).toBe(true);
    expect(
      hasActiveAccess(sub({ status: 'trialing', trial_end: '2020-01-01T00:00:00.000Z' })),
    ).toBe(false);
  });
});

import Link from 'next/link';
import { redirect } from 'next/navigation';
import Lockup from '@/components/Lockup';
import AppFooter from '@/components/AppFooter';
import WelcomePoll from '@/components/WelcomePoll';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSubscriptionByEmail, hasActiveAccess } from '@/lib/subscriptions';

export const metadata = {
  title: 'Content Radar — Setting up your account',
};

// Where Stripe returns a member after a successful checkout.
//
// It exists because the return redirect races the webhook that writes the
// subscriptions row. Sending them straight to /dashboard meant losing that race
// bounced a member who had *just paid* back to /start-trial, reading as "it
// didn't work" — the worst possible first minute of being a customer. This page
// is session-gated but NOT access-gated, so it can hold them for the second or
// two the webhook takes, then send them on.
export default async function WelcomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const subscription = await getSubscriptionByEmail(user.email);
  if (hasActiveAccess(subscription)) {
    redirect('/dashboard');
  }

  return (
    <div className="cr-board" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-card)',
            padding: '48px 44px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Lockup variant="primary" size={30} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '28px 0 0' }}>
            Setting up your account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
            Your payment went through. We&rsquo;re just confirming it with Stripe &mdash; this usually
            takes a couple of seconds, and you&rsquo;ll go straight to your dashboard.
          </p>

          <WelcomePoll />

          <p style={{ margin: '22px 0 0' }}>
            <Link href="/dashboard" className="cr-link" style={{ fontSize: 12, color: 'var(--signal-deep)', textDecoration: 'none' }}>
              Go to the dashboard →
            </Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

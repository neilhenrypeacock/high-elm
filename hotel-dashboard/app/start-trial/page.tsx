import Link from 'next/link';
import { redirect } from 'next/navigation';
import Lockup from '@/components/Lockup';
import SignupForm from '@/components/SignupForm';
import CheckoutButton from '@/components/CheckoutButton';
import AppFooter from '@/components/AppFooter';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSubscriptionByEmail, hasActiveAccess } from '@/lib/subscriptions';

export const metadata = {
  title: 'Content Radar — Start your free trial',
};

// The single "start your trial" path, context-aware:
// - Not logged in            → create-account form (email confirmation).
// - Logged in, no active sub → start the Stripe trial (card, nothing charged).
// - Logged in, active sub    → already a member, into the dashboard.
export default async function StartTrialPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const cancelled = status === 'cancelled';

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const subscription = await getSubscriptionByEmail(user.email);
    if (hasActiveAccess(subscription)) {
      redirect('/dashboard');
    }
  }

  const loggedIn = !!user?.email;

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
            Start your free trial
          </h1>

          {loggedIn ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
                You&rsquo;re all set. Start your 14-day free trial — we&rsquo;ll ask for a card to hold your
                place, but nothing is charged today. Cancel any time before the trial ends.
              </p>
              {cancelled && (
                <p style={{ fontSize: 13, color: 'var(--body-mid)', lineHeight: 1.6, margin: '14px 0 0' }}>
                  No problem — checkout was cancelled. Start whenever you&rsquo;re ready.
                </p>
              )}
              <CheckoutButton />
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
                Create your account and confirm your email — then you&rsquo;ll start your 14-day
                free trial and drop straight into the dashboard.
              </p>
              <SignupForm />
            </>
          )}

          <p style={{ margin: '22px 0 0', display: 'flex', justifyContent: 'center', gap: 18 }}>
            {!loggedIn && (
              <Link href="/login" className="cr-link" style={{ fontSize: 12, color: 'var(--signal-deep)', textDecoration: 'none' }}>
                Already have an account? Log in
              </Link>
            )}
            <Link href="/" className="cr-link" style={{ fontSize: 12, color: 'var(--signal-deep)', textDecoration: 'none' }}>
              ← Back to Content Radar
            </Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

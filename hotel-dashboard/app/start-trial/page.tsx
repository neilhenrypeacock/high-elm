import Link from 'next/link';
import Lockup from '@/components/Lockup';
import TrialSignupForm from '@/components/TrialSignupForm';
import SignupForm from '@/components/SignupForm';
import AppFooter from '@/components/AppFooter';
import { stripeDisabled } from '@/lib/auth-mode';

export const metadata = {
  title: 'Content Radar — Start your free trial',
};

// Two modes (lib/auth-mode.ts):
// - Beta (STRIPE_DISABLED=true): full account-creation form — name, hotel,
//   email, password → instant 14-day trial, no card, straight into the app.
// - Launch: the original email-capture step → Stripe Checkout.
export default function StartTrialPage() {
  const beta = stripeDisabled();

  return (
    <div className="cr-board" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
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
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: '28px 0 0',
          }}
        >
          Start your free trial
        </h1>
        <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
          {beta ? (
            <>Create your account and you&rsquo;re straight in — 14 days of the full dashboard, no card needed.</>
          ) : (
            <>Enter your email and we&rsquo;ll take you to a secure checkout to set up your 14-day trial.</>
          )}
        </p>
        {beta ? <SignupForm /> : <TrialSignupForm />}
        <p style={{ margin: '22px 0 0', display: 'flex', justifyContent: 'center', gap: 18 }}>
          <Link href="/login" className="cr-link" style={{ fontSize: 12, color: 'var(--signal-deep)', textDecoration: 'none' }}>
            Already have an account? Log in
          </Link>
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

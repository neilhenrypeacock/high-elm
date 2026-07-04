import Link from 'next/link';
import Lockup from '@/components/Lockup';
import TrialSignupForm from '@/components/TrialSignupForm';

export const metadata = {
  title: 'Content Radar — Start your free trial',
};

export default function StartTrialPage() {
  return (
    <main
      className="cr-board"
      style={{
        minHeight: '100vh',
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
          Enter your email and we&rsquo;ll take you to a secure checkout to set up your
          14-day trial.
        </p>
        <TrialSignupForm />
        <p style={{ margin: '22px 0 0' }}>
          <Link href="/" className="cr-link" style={{ fontSize: 12, color: 'var(--signal-deep)', textDecoration: 'none' }}>
            ← Back to Content Radar
          </Link>
        </p>
      </div>
    </main>
  );
}

import Link from 'next/link';
import Lockup from '@/components/Lockup';

// Placeholder destination for every "Start your free trial" CTA.
// When Stripe Checkout is built, either replace this page's content with the
// checkout flow or repoint TRIAL_HREF in components/Landing.tsx.

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
          maxWidth: 520,
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
          Founding member trials are opening soon.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
          We&rsquo;re onboarding the first 50 founding members personally. Email us and
          we&rsquo;ll set you up with your 14-day free trial.
        </p>
        <div style={{ marginTop: 26 }}>
          <a
            href="mailto:hello@highelm.studio?subject=Content%20Radar%20%E2%80%94%20free%20trial"
            className="cr-lift"
            style={{
              display: 'inline-block',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              color: '#F7F6F2',
              background: 'var(--ink)',
              borderRadius: 10,
              padding: '13px 26px',
            }}
          >
            Email hello@highelm.studio
          </a>
        </div>
        <p style={{ margin: '22px 0 0' }}>
          <Link href="/" className="cr-link" style={{ fontSize: 12, color: 'var(--signal-deep)', textDecoration: 'none' }}>
            ← Back to Content Radar
          </Link>
        </p>
      </div>
    </main>
  );
}

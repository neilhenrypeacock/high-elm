import Link from 'next/link';
import Lockup from '@/components/Lockup';
import LoginForm from '@/components/LoginForm';
import AppFooter from '@/components/AppFooter';

export const metadata = {
  title: 'Content Radar — Log in',
};

export default function LoginPage() {
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
          maxWidth: 420,
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
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '28px 0 0' }}>
          Log in to Content Radar
        </h1>
        <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
          We&rsquo;ll email you a one-click link — no password needed.
        </p>
        <LoginForm />
        <p style={{ margin: '22px 0 0' }}>
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

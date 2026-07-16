import Link from 'next/link';
import Lockup from '@/components/Lockup';
import NewPasswordForm from '@/components/NewPasswordForm';
import AppFooter from '@/components/AppFooter';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const metadata = {
  title: 'Content Radar — Set a new password',
};

// Landing page for a password-recovery link. /auth/callback verifies the
// recovery token and establishes a short session before forwarding here, so a
// visitor with no session reached this URL without a valid link — show the
// expired state rather than an unusable form.
export default async function NewPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="cr-board" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
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

          {user ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '28px 0 0' }}>
                Set a new password
              </h1>
              <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
                Choose a new password for <strong style={{ color: 'var(--ink)' }}>{user.email}</strong>.
              </p>
              <NewPasswordForm />
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '28px 0 0' }}>
                This reset link has expired
              </h1>
              <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, margin: '14px 0 0' }}>
                Password reset links can only be used once and time out for security. Request a fresh one and we&rsquo;ll email it over.
              </p>
              <div style={{ marginTop: 26 }}>
                <Link
                  href="/login"
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
                  Back to log in
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

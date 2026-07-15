'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Floating "Admin" indicator, shown on every gated page while an admin is
// logged in (AppShell renders it only when isAdmin). Confirms you're in an
// admin session at a glance and links to the editorial page. On /admin itself
// it reads as the active state rather than a call to action.
export default function AdminPill() {
  const pathname = usePathname();
  const onAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <Link
      href="/admin"
      aria-label={onAdmin ? 'Admin mode (current page)' : 'Go to admin'}
      aria-current={onAdmin ? 'page' : undefined}
      title="Admin"
      className="cr-admin-pill"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 60,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 14px',
        borderRadius: 999,
        background: 'var(--ink-deep)',
        border: '1px solid var(--signal-deep)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
        textDecoration: 'none',
        fontFamily: 'var(--font-body), sans-serif',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--on-dark)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--signal-light)',
          boxShadow: '0 0 0 3px rgba(127,193,162,0.25)',
        }}
      />
      Admin
    </Link>
  );
}

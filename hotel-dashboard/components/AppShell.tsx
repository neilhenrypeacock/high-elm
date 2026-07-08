'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MarkSvg from './MarkSvg';

// Gated-area shell: fixed left sidebar on desktop, off-canvas drawer on mobile.
// Wraps existing gated pages (dashboard, saved, watchlist, settings, profile)
// without touching their internals — the page passes its content as children.
//
// The member's name + Log out sit at the bottom. Log out POSTs to the sign-out
// route (a GET could be triggered by link prefetch); the browser follows its
// redirect back to the marketing home.

interface AppShellProps {
  userName: string;
  userEmail: string | null;
  children: React.ReactNode;
}

type IconProps = { active: boolean };
const stroke = (active: boolean) => (active ? 'var(--signal-deep)' : 'var(--body-mid)');

function DashboardIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" stroke={stroke(active)} strokeWidth="1.7" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" stroke={stroke(active)} strokeWidth="1.7" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" stroke={stroke(active)} strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" stroke={stroke(active)} strokeWidth="1.7" />
    </svg>
  );
}
function SavedIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <path d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.6L5 20V5.5a1 1 0 0 1 1-1z" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function WatchlistIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" stroke={stroke(active)} strokeWidth="1.7" />
    </svg>
  );
}
function SettingsIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <circle cx="12" cy="12" r="3" stroke={stroke(active)} strokeWidth="1.7" />
      <path d="M12 2.6v2.3M12 19.1v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.6 12h2.3M19.1 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/saved', label: 'Saved', Icon: SavedIcon },
  { href: '/watchlist', label: 'Watchlist', Icon: WatchlistIcon },
];

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <MarkSvg size={size} color="#262420" />
      <span
        style={{
          fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        content radar
      </span>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AppShell({ userName, userEmail, children }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const navItem = (href: string, label: string, Icon: (p: IconProps) => React.ReactNode) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={close}
        className="cr-shell-navitem"
        data-active={active}
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '10px 12px',
          borderRadius: 10,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          color: active ? 'var(--ink)' : 'var(--body-soft)',
        }}
      >
        <Icon active={active} />
        <span>{label}</span>
      </Link>
    );
  };

  const sidebar = (
    <aside className="cr-shell-aside" aria-label="Main navigation">
      <div style={{ padding: '22px 18px 18px' }}>
        <Link href="/dashboard" onClick={close} style={{ textDecoration: 'none' }}>
          <BrandMark />
        </Link>
      </div>

      <nav style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {PRIMARY_NAV.map(({ href, label, Icon }) => navItem(href, label, Icon))}
        <div style={{ height: 1, background: 'var(--line-soft)', margin: '10px 6px' }} />
        {navItem('/settings', 'Settings', SettingsIcon)}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Member card — name links to profile; Log out posts to the sign-out route */}
      <div style={{ borderTop: '1px solid var(--line-soft)', padding: '14px 14px 18px' }}>
        <Link
          href="/profile"
          onClick={close}
          className="cr-shell-navitem"
          data-active={isActive('/profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '9px 10px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              flex: 'none',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--top3-tint)',
              color: 'var(--signal-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.02em',
            }}
          >
            {initials(userName)}
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 13.5,
                fontWeight: 600,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userName}
            </span>
            <span
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--body-mid)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              View profile
            </span>
          </span>
        </Link>

        <form action="/api/auth/logout" method="post" style={{ marginTop: 4 }}>
          <button
            type="submit"
            className="cr-shell-navitem"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 12px',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--body-soft)',
              textAlign: 'left',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
              <path d="M15 4.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H15" stroke="var(--body-mid)" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M11 12h9m0 0-3.2-3.2M20 12l-3.2 3.2" stroke="var(--body-mid)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <div className={`cr-shell cr-board${open ? ' cr-shell--open' : ''}`}>
      <div className="cr-shell-scrim" onClick={close} aria-hidden="true" />
      {sidebar}

      <div className="cr-shell-main">
        {/* Mobile top bar — mark + hamburger (hidden on desktop via CSS). Just the
            mark, not the wordmark: the dashboard renders its own branded top bar
            right below, so a full lockup here would double it. The drawer carries
            the full lockup. */}
        <div className="cr-shell-mobilebar">
          <Link href="/dashboard" aria-label="Content Radar home" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <MarkSvg size={26} color="#262420" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

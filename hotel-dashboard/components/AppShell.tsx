'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MarkSvg from './MarkSvg';
import AppFooter from './AppFooter';
import PageInfoModal, { resolveInfoKey } from './PageInfo';

// Gated-area shell: fixed left sidebar on desktop, off-canvas drawer on mobile.
// Wraps existing gated pages (dashboard, saved, watchlist, settings, profile)
// without touching their internals — the page passes its content as children.
//
// The sidebar is the ONE nav for the gated area: primary routes, plus (on the
// dashboard) the in-page section jump-links and the "Request a feature" action
// that used to live in a separate floating bottom bar. On desktop it collapses
// to an icon rail (choice persisted in localStorage); on mobile it stays a full
// hamburger drawer — the collapse only applies ≥861px via CSS, so a rail set on
// desktop never shrinks the mobile drawer.
//
// The member's name + Log out sit at the bottom. Log out POSTs to the sign-out
// route (a GET could be triggered by link prefetch); the browser follows its
// redirect back to the marketing home.

interface AppShellProps {
  userName: string;
  userEmail: string | null;
  children: React.ReactNode;
  /** Optional right-aligned footer caption (e.g. the dashboard's weekly date). */
  footerNote?: string;
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
function YourHotelIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <path d="M5.5 20.5V5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v15.5" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 20.5h18" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 7.5h1.6M13.4 7.5H15M9 11h1.6M13.4 11H15" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10.5 20.5v-3.4a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3.4" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
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
function FeatureIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <path d="M5 5.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9.5L5.5 20v-3.5H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" stroke="var(--body-mid)" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 8.6v4.2M9.9 10.7h4.2" stroke="var(--body-mid)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// In-page section anchors on the dashboard (folded in from the old floating nav).
// The ids live in components/Dashboard.tsx.
const DASHBOARD_SECTIONS = [
  { href: '#overview', label: 'This week' },
  { href: '#breakouts', label: 'Top posts' },
  { href: '#working', label: "What's working" },
  { href: '#leaderboard', label: 'Leaderboard' },
];

const FEATURE_MAILTO =
  'mailto:hello@highelm.studio?subject=Content%20Radar%20%E2%80%94%20feature%20request';

function BrandMark() {
  return (
    <div className="cr-brand-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <MarkSvg size={22} color="#262420" />
      <span
        className="cr-brand-word"
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

export default function AppShell({ userName, userEmail, children, footerNote }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail
  const [ready, setReady] = useState(false); // gates the width transition until after first paint
  const [infoOpen, setInfoOpen] = useState(false); // "explain this page" modal
  const [hash, setHash] = useState(''); // tracks the active dashboard section
  const close = () => setOpen(false);

  // Track the URL hash so the "i" explainer follows the active dashboard section
  // (the section links are plain #hash anchors, so hashchange fires on click).
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const infoKey = resolveInfoKey(pathname, hash);

  // Restore the persisted rail choice, then enable the width transition one frame
  // later so the restored state paints instantly (no collapse animation on load).
  useEffect(() => {
    const saved = typeof window !== 'undefined' && window.localStorage.getItem('cr-shell-collapsed') === '1';
    // Hydrate the rail choice from localStorage on mount (SSR can't read it, so
    // the server always renders the expanded default; this reconciles on the client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(saved);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem('cr-shell-collapsed', next ? '1' : '0');
      } catch {
        /* ignore private-mode storage errors */
      }
      return next;
    });

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const onDashboard = isActive('/dashboard');

  const navItem = (href: string, label: string, Icon: (p: IconProps) => React.ReactNode) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={close}
        title={collapsed ? label : undefined}
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
        <span className="cr-navlabel">{label}</span>
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
        {/* "i" — explain the current page in a biggish modal */}
        <button
          type="button"
          onClick={() => { setInfoOpen(true); close(); }}
          title={collapsed ? 'About this page' : undefined}
          className="cr-shell-navitem cr-info-navitem"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--body-soft)',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '1.6px solid var(--signal-deep)',
              color: 'var(--signal-deep)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="7.4" r="1.25" fill="currentColor" />
              <path d="M12 11v6.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cr-navlabel">About this page</span>
        </button>

        {navItem('/dashboard', 'Dashboard', DashboardIcon)}

        {/* In-page section links — only on the dashboard, only in the full state */}
        {onDashboard && (
          <div
            className="cr-subnav"
            style={{
              margin: '1px 0 3px 23px',
              paddingLeft: 8,
              borderLeft: '1px solid var(--line-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {DASHBOARD_SECTIONS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                onClick={close}
                className="cr-shell-navitem"
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--body-soft)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </a>
            ))}
          </div>
        )}

        {navItem('/hotel', 'Your hotel', YourHotelIcon)}
        {navItem('/saved', 'Saved', SavedIcon)}
        {navItem('/watchlist', 'Watchlist', WatchlistIcon)}
        <div style={{ height: 1, background: 'var(--line-soft)', margin: '10px 6px' }} />
        {navItem('/settings', 'Settings', SettingsIcon)}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Request a feature — folded in from the old floating nav */}
      <div style={{ padding: '0 12px' }}>
        <a
          href={FEATURE_MAILTO}
          title={collapsed ? 'Request a feature' : undefined}
          className="cr-shell-navitem"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 12px',
            borderRadius: 10,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--body-soft)',
          }}
        >
          <FeatureIcon />
          <span className="cr-navlabel">Request a feature</span>
        </a>
      </div>

      {/* Collapse toggle (desktop only; hidden on mobile via CSS) */}
      <div style={{ padding: '4px 12px 8px' }}>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="cr-shell-navitem cr-shell-collapsebtn"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--body-mid)',
            textAlign: 'left',
          }}
        >
          <svg
            className="cr-collapse-chevron"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flex: 'none' }}
          >
            <path d="M14.5 7 9.5 12l5 5" stroke="var(--body-mid)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="cr-navlabel">Collapse</span>
        </button>
      </div>

      {/* Member card — name links to profile; Log out posts to the sign-out route */}
      <div style={{ borderTop: '1px solid var(--line-soft)', padding: '14px 14px 18px' }}>
        <Link
          href="/profile"
          onClick={close}
          title={collapsed ? userName : undefined}
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
          <span className="cr-member-text" style={{ minWidth: 0 }}>
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
            title={collapsed ? 'Log out' : undefined}
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
            <span className="cr-navlabel">Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <div
      className={`cr-shell cr-board${open ? ' cr-shell--open' : ''}${collapsed ? ' cr-shell--collapsed' : ''}${ready ? ' cr-shell--ready' : ''}`}
    >
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

        <AppFooter note={footerNote} />
      </div>

      <PageInfoModal open={infoOpen} infoKey={infoKey} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

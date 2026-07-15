'use client';

import { useEffect, useState } from 'react';

// Floating development-only navigation menu. Lists every page and the whole
// customer flow in one place so you can jump around while building — no more
// hand-typing routes. NEVER shows in production: it is mounted in
// app/layout.tsx behind a guard (see shouldShowDevMenu below), so the panel and
// its markup are only rendered in local dev or on a preview that opts in with
// NEXT_PUBLIC_DEV_MENU=1. It is a pure client-side <a>-list — it does NOT bypass
// auth; gated pages still redirect to /login unless you have a session (use a
// DISABLE_DASHBOARD_AUTH=true local run to walk them without signing in).

type Link = { href: string; label: string; note?: string };
type Group = { title: string; hint?: string; links: Link[] };

// Ordered the way a customer actually moves through the product.
const GROUPS: Group[] = [
  {
    title: 'Public / marketing',
    hint: 'No auth — anyone can see these',
    links: [
      { href: '/', label: 'Landing', note: 'public home + live taster' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/about', label: 'About' },
    ],
  },
  {
    title: 'Onboarding & auth',
    hint: 'Sign-up → trial → session',
    links: [
      { href: '/start-trial', label: 'Start trial', note: 'signup form (beta)' },
      { href: '/login', label: 'Log in', note: 'password + magic link' },
      { href: '/subscribe', label: 'Subscribe', note: 'shown to lapsed members' },
    ],
  },
  {
    title: 'Gated app',
    hint: 'Needs a session + active trial/sub',
    links: [
      { href: '/dashboard', label: 'Dashboard', note: 'the main product' },
      { href: '/hotel', label: 'Your Hotel', note: 'own-hotel mirror (demo data)' },
    ],
  },
  {
    title: 'Account',
    hint: 'Gated member pages',
    links: [
      { href: '/profile', label: 'Profile', note: 'name + set password' },
      { href: '/settings', label: 'Settings', note: 'plan, dark mode, billing' },
      { href: '/saved', label: 'Saved posts' },
      { href: '/watchlist', label: 'Watchlist' },
    ],
  },
  {
    title: 'Admin',
    hint: 'Founder accounts only',
    links: [{ href: '/admin', label: 'Admin', note: "editor's note + picks" }],
  },
];

const STORAGE_KEY = 'cr-devmenu-open';
const ENABLED_KEY = 'cr-devmenu-enabled';

// Whether the menu is allowed to show in THIS browser.
//   • Local dev / an env that sets NEXT_PUBLIC_DEV_MENU=1 → always on.
//   • Live production → off for everyone, unless this browser has flipped the
//     secret toggle by visiting any page with ?devmenu=1 (persisted in
//     localStorage). ?devmenu=0 turns it back off. So a normal customer never
//     sees it; only a browser you've deliberately enabled does.
function computeEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (process.env.NEXT_PUBLIC_DEV_MENU === '1') return true;
  try {
    return window.localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

// Coloured trial/plan chip for the readout: green = active/trialing, amber for
// lapsed states, grey while unknown.
function statusChip(status: string | null, trialEndsInDays: number | null) {
  const active = status === 'active' || status === 'trialing';
  const label =
    status === 'trialing' && trialEndsInDays != null
      ? `trial · ${trialEndsInDays}d left`
      : (status ?? 'no sub');
  return { label, color: active ? '#7FC1A2' : '#E0A96D' };
}

function SessionReadout({ session }: { session: Session | null }) {
  let body: React.ReactNode;
  if (session == null) {
    body = <span style={{ color: 'rgba(242,239,231,0.45)' }}>Checking session…</span>;
  } else if (!session.signedIn) {
    body = <span style={{ color: 'rgba(242,239,231,0.55)' }}>Signed out</span>;
  } else {
    const chip = statusChip(session.status, session.trialEndsInDays);
    body = (
      <>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#F2EFE7',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.email}
          {session.admin && (
            <span style={{ color: '#7FC1A2', fontWeight: 700 }}> · admin</span>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: chip.color }}>{chip.label}</span>
      </>
    );
  }
  return (
    <div
      style={{
        margin: '0 8px 10px',
        padding: '8px 10px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        fontSize: 12,
      }}
    >
      {body}
    </div>
  );
}

type Session =
  | { signedIn: false }
  | {
      signedIn: true;
      email: string;
      admin: boolean;
      status: string | null;
      trialEndsInDays: number | null;
    };

export default function DevMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [path, setPath] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Honour ?devmenu=1 / ?devmenu=0 to flip the per-browser secret toggle,
    // then strip the param from the URL so it doesn't linger or get shared.
    try {
      const url = new URL(window.location.href);
      const param = url.searchParams.get('devmenu');
      if (param === '1' || param === '0') {
        window.localStorage.setItem(ENABLED_KEY, param);
        url.searchParams.delete('devmenu');
        window.history.replaceState(null, '', url.toString());
      }
    } catch {
      /* ignore */
    }

    let openInit = false;
    try {
      openInit = window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      /* ignore private-mode storage errors */
    }

    // One-time sync of DOM/storage-derived state into React on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setEnabled(computeEnabled());
    setPath(window.location.pathname);
    setOpen(openInit);
  }, []);

  // Pull the current session/trial state once the panel is first opened (cheap,
  // and avoids a getUser() call on every page load when it's collapsed).
  useEffect(() => {
    if (!open || session) return;
    let live = true;
    fetch('/api/dev/session')
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((data) => {
        if (live) setSession(data);
      })
      .catch(() => {
        if (live) setSession({ signedIn: false });
      });
    return () => {
      live = false;
    };
  }, [open, session]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Don't render until mounted so SSR markup (which can't read localStorage or
  // the current path) never mismatches the client. In production the menu is
  // also hidden unless this browser has flipped the secret toggle (see
  // computeEnabled) — so customers never see it.
  if (!mounted || !enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 2147483000,
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        // Never intercept clicks meant for the app when collapsed.
        pointerEvents: 'none',
      }}
    >
      {open && (
        <nav
          aria-label="Development navigation"
          style={{
            pointerEvents: 'auto',
            width: 260,
            maxHeight: '70vh',
            overflowY: 'auto',
            background: '#232019',
            color: '#F2EFE7',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
            padding: '14px 6px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px 10px',
              marginBottom: 4,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#7FC1A2',
              }}
            >
              Dev menu
            </span>
            <button
              type="button"
              onClick={toggle}
              aria-label="Close dev menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(242,239,231,0.7)',
                fontSize: 16,
                lineHeight: 1,
                cursor: 'pointer',
                padding: 2,
              }}
            >
              ×
            </button>
          </div>

          <SessionReadout session={session} />

          {GROUPS.map((group) => (
            <div key={group.title} style={{ marginBottom: 10 }}>
              <div
                style={{
                  padding: '4px 12px 2px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(242,239,231,0.55)',
                }}
              >
                {group.title}
              </div>
              {group.hint && (
                <div
                  style={{
                    padding: '0 12px 4px',
                    fontSize: 11,
                    color: 'rgba(242,239,231,0.4)',
                  }}
                >
                  {group.hint}
                </div>
              )}
              {group.links.map((link) => {
                const active = path === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    style={{
                      display: 'block',
                      padding: '6px 12px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: active ? '#7FC1A2' : '#F2EFE7',
                      background: active ? 'rgba(127,193,162,0.12)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{link.label}</span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'rgba(242,239,231,0.45)',
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      }}
                    >
                      {link.href}
                      {link.note ? ` — ${link.note}` : ''}
                    </span>
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close dev menu' : 'Open dev menu'}
        aria-expanded={open}
        title="Development menu (not shown in production)"
        style={{
          pointerEvents: 'auto',
          width: 44,
          height: 44,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.12)',
          background: '#2E7357',
          color: '#fff',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {open ? '×' : '⌘'}
      </button>
    </div>
  );
}

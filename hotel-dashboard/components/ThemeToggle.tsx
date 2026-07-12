'use client';

import { useEffect, useState } from 'react';

// Dark-mode switch for the Settings page. The actual theme is applied by setting
// data-theme="dark" on <html>; an inline script in app/layout.tsx restores the
// saved choice before first paint (no flash), and the dark palette itself lives
// in app/globals.css, scoped to the gated app shell.
//
// SSR renders with no knowledge of the stored choice, so the switch starts in a
// neutral "unset" state and syncs from the DOM/localStorage on mount — this
// avoids a hydration mismatch.

const STORAGE_KEY = 'cr-theme';

function applyTheme(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  try {
    window.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    /* ignore private-mode storage errors */
  }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Reconcile from what the layout script already put on <html> (falling back
    // to localStorage), so the switch reflects the live theme on load.
    const current = document.documentElement.getAttribute('data-theme');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(current === 'dark');
    setReady(true);
  }, []);

  const toggle = () => {
    setDark((v) => {
      const next = !v;
      applyTheme(next);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Dark mode</div>
        <p style={{ fontSize: 13, color: 'var(--body-soft)', margin: '3px 0 0', lineHeight: 1.55 }}>
          Use a darker palette across your dashboard. Saved to this browser.
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        onClick={toggle}
        style={{
          flex: 'none',
          position: 'relative',
          width: 52,
          height: 30,
          borderRadius: 999,
          border: '1px solid var(--line-strong)',
          background: dark ? 'var(--signal-deep)' : 'var(--surface-alt-2)',
          cursor: 'pointer',
          padding: 0,
          transition: 'background 0.18s ease',
          // Hide the knob's position jump until we've synced from storage.
          opacity: ready ? 1 : 0,
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 3,
            left: dark ? 25 : 3,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: dark ? 'var(--on-dark)' : 'var(--surface)',
            boxShadow: '0 1px 3px rgba(20, 18, 15, 0.35)',
            transition: 'left 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </button>
    </div>
  );
}

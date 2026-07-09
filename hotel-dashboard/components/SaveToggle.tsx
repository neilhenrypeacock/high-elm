'use client';

import { useState } from 'react';

// One toggle for both affordances so Save (posts) and Save-to-watchlist (hotels)
// read identically: a bookmark that fills when saved. Generic over the endpoint
// + bodies; optimistic, reverts on failure, sends a logged-out user to /login.

type Variant = 'overlay' | 'inline';

export default function SaveToggle({
  initialSaved,
  endpoint,
  saveBody,
  deleteBody,
  label,
  savedLabel,
  onChange,
  variant = 'inline',
}: {
  initialSaved: boolean;
  endpoint: string;
  saveBody: unknown;
  deleteBody: unknown;
  label: string;      // aria-label when not saved (e.g. "Save post")
  savedLabel: string; // aria-label when saved (e.g. "Saved — remove")
  onChange?: (saved: boolean) => void;
  variant?: Variant;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    // These sit inside/over a link (card media, table row) — never navigate.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !saved;
    setSaved(next);
    setPending(true);
    onChange?.(next);

    try {
      const res = await fetch(endpoint, {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next ? saveBody : deleteBody),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('request failed');
    } catch {
      setSaved(!next); // revert
      onChange?.(!next);
    } finally {
      setPending(false);
    }
  }

  const isOverlay = variant === 'overlay';
  const size = isOverlay ? 34 : 30;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? savedLabel : label}
      title={saved ? savedLabel : label}
      className="cr-save-toggle"
      data-saved={saved}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flex: 'none',
        borderRadius: isOverlay ? '50%' : 8,
        cursor: pending ? 'default' : 'pointer',
        border: isOverlay ? 'none' : '1px solid var(--line)',
        background: isOverlay ? 'rgba(247,246,242,0.92)' : 'transparent',
        boxShadow: isOverlay ? '0 2px 8px -2px rgba(20,18,15,0.35)' : 'none',
        opacity: pending ? 0.6 : 1,
        transition: 'background 0.12s, border-color 0.12s, opacity 0.12s',
        padding: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
        <path
          d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.6L5 20V5.5a1 1 0 0 1 1-1z"
          fill={saved ? 'var(--signal-deep)' : 'none'}
          stroke={saved ? 'var(--signal-deep)' : 'var(--body-mid)'}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

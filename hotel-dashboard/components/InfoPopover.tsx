'use client';

import { useEffect, useId, useRef, useState } from 'react';

const LABEL = "var(--font-label), 'Space Mono', monospace";

// A discreet "i" affordance that opens a short explainer panel: what a feature
// is and how to use it. Click (or Enter/Space) to open; Escape or an outside
// click closes it. Rendered inline beside a section title. Purely presentational
// — no data, safe to drop anywhere in the gated UI.
export default function InfoPopover({
  title,
  children,
  label = 'What is this?',
  onDark = false,
}: {
  title: string;
  children: React.ReactNode;
  /** Accessible label for the trigger (defaults to "What is this?"). */
  label?: string;
  /** Style the trigger for placement on a dark band (e.g. the hero). */
  onDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        className="cr-info-trigger"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: `1px solid ${
            open
              ? (onDark ? 'var(--signal-light)' : 'var(--signal-deep)')
              : (onDark ? 'rgba(245,240,232,0.28)' : 'var(--line)')
          }`,
          background: open && !onDark ? 'var(--top3-tint)' : (onDark ? 'transparent' : 'var(--surface)'),
          color: open
            ? (onDark ? 'var(--signal-light)' : 'var(--signal-deep)')
            : (onDark ? 'var(--on-dark-soft, #A49D92)' : 'var(--muted)'),
          cursor: 'pointer',
          padding: 0,
          fontFamily: LABEL,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
          transition: 'background 0.12s, color 0.12s, border-color 0.12s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="7.6" r="1.15" fill="currentColor" />
          <path d="M12 11v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <span
          id={panelId}
          role="dialog"
          aria-label={title}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            zIndex: 40,
            display: 'block',
            width: 320,
            maxWidth: 'min(320px, calc(100vw - 48px))',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-pop, 0 18px 40px -16px rgba(20,18,15,0.35))',
            padding: '16px 18px',
            textAlign: 'left',
            cursor: 'default',
          }}
        >
          <span
            style={{
              display: 'block',
              fontFamily: LABEL,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--signal-deep)',
              marginBottom: 8,
            }}
          >
            {title}
          </span>
          <span style={{ display: 'block', fontSize: 13, lineHeight: 1.6, color: 'var(--body-strong)', fontWeight: 400 }}>
            {children}
          </span>
        </span>
      )}
    </span>
  );
}

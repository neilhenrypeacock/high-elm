'use client';

import { useEffect, useState } from 'react';

// First-login orientation. Shown ONCE, fully skippable, and never nags again —
// a localStorage flag records that it's been seen (v1 = good enough for now; a
// server-side "seen" flag can replace it later without changing the steps).
//
// Deliberately mounted as a sibling of <Dashboard> in app/dashboard/page.tsx, so
// it adds orientation without touching any dashboard internals.

const SEEN_KEY = 'cr_welcome_seen_v1';

const STEPS = [
  {
    kicker: 'Welcome to Content Radar',
    title: 'What a “breakout” means',
    body: 'A breakout is any hotel post that beat its own hotel’s normal engagement by 2× or more. Because every post is judged against its own account — not against giant accounts — a small hotel’s hit counts just as much as a famous one’s. No follower-count bias.',
  },
  {
    kicker: 'Step 2 of 4',
    title: 'Switch the time window',
    body: 'The Top posts list has a Last 7 days / Last 30 days / All time toggle. Start on 7 days for this week’s signal, widen to 30 days or all time when you want a deeper well of proven ideas.',
  },
  {
    kicker: 'Step 3 of 4',
    title: 'Read the leaderboard',
    body: 'The Hotel leaderboard ranks every tracked hotel by true engagement rate — the average across each hotel’s last 30 posts, not raw follower count. Search or sort by region to find peers worth watching.',
  },
  {
    kicker: 'Step 4 of 4',
    title: 'Need a hand?',
    body: 'Use the “Request a feature” pill at the bottom of the dashboard any time, or email hello@highelm.studio. We read every message.',
  },
];

export default function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Read the "seen" flag after mount (localStorage is client-only). Deferred to
    // a microtask so we're not setting state synchronously inside the effect body.
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        if (!localStorage.getItem(SEEN_KEY)) setVisible(true);
      } catch {
        // Private mode / storage blocked — just don't show it rather than error.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Getting started with Content Radar"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(20, 18, 15, 0.5)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 460,
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-hover)',
          padding: '34px 34px 28px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-label), sans-serif',
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--signal-deep)',
          }}
        >
          {current.kicker}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-body), sans-serif',
            fontWeight: 700,
            fontSize: 23,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: '12px 0 0',
          }}
        >
          {current.title}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--body-soft)', margin: '14px 0 0' }}>
          {current.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 26 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                height: 6,
                flex: 1,
                borderRadius: 3,
                background: i <= step ? 'var(--signal)' : 'var(--track)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--body-mid)',
            }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
            className="cr-lift"
            style={{
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#F7F6F2',
              background: 'var(--ink)',
              border: '1px solid var(--ink)',
              borderRadius: 10,
              padding: '11px 24px',
              cursor: 'pointer',
            }}
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

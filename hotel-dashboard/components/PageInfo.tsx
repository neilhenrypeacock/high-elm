'use client';

import { useEffect } from 'react';

// "About this view" modal, opened from the left sidebar's per-view "i" buttons.
// Content is keyed by the active view — for the dashboard that's the current
// section (driven by the URL hash), for the account pages it's the route.
// Each entry is three short blocks — What this is / How it works / Why it helps.

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";

export type InfoKey =
  | 'overview'
  | 'breakouts'
  | 'working'
  | 'leaderboard'
  | 'hotel'
  | 'saved'
  | 'watchlist'
  | 'settings'
  | 'profile';

type InfoBlock = { h: string; p: string };
type InfoContent = { title: string; blocks: InfoBlock[] };

// Resolve the current view from the route + hash.
export function resolveInfoKey(pathname: string, hash: string): InfoKey {
  if (pathname.startsWith('/dashboard')) {
    const h = hash.replace(/^#/, '');
    if (h === 'breakouts' || h === 'working' || h === 'leaderboard') return h;
    return 'overview';
  }
  if (pathname.startsWith('/hotel')) return 'hotel';
  if (pathname.startsWith('/saved')) return 'saved';
  if (pathname.startsWith('/watchlist')) return 'watchlist';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'overview';
}

// The four dashboard views use the Content Radar design system's canonical copy
// verbatim. The five account keys aren't in the design bundle, so their copy is
// adapted into the same three-block shape.
const CONTENT: Record<InfoKey, InfoContent> = {
  overview: {
    title: 'This week',
    blocks: [
      { h: 'What this is', p: 'A weekly snapshot of every post across the 400+ tracked five-star hotels that beat its own hotel’s usual engagement this week — plus the hotels on your watchlist.' },
      { h: 'How it works', p: 'Every Monday we scrape the latest posts, compare each to its hotel’s median over the last 30 posts, and count the ones that cleared 2×. The headline number is that count; “in focus” summarises the patterns behind it.' },
      { h: 'Why it helps', p: 'You see the week’s biggest movers at a glance — the proof, ranked, in ten seconds — without scrolling a single feed.' },
    ],
  },
  breakouts: {
    title: 'Top posts',
    blocks: [
      { h: 'What this is', p: 'The ranked list of breakout posts — every post beating its hotel’s own median by 2× or more, best first, no exceptions.' },
      { h: 'How it works', p: 'Choose a time window (7 days, 30 days, or all time) and filter by format or collaborations. Posts rank by multiple, not raw likes, so a smaller hotel’s genuine hit isn’t buried under a bigger grid’s baseline.' },
      { h: 'Why it helps', p: 'A refreshed ideas library — see exactly which posts are working right now, and why, so you can adapt the format for your own hotel.' },
    ],
  },
  working: {
    title: "What's working",
    blocks: [
      { h: 'What this is', p: 'A zoomed-out read on portfolio performance over the last 30 days or all time — the patterns behind the breakouts, not the individual posts.' },
      { h: 'How it works', p: 'We aggregate engagement by format, caption length and day of week, track the movement against the previous period, and surface the best posts of the window. Everything is correlation, honestly hedged — not a guarantee.' },
      { h: 'Why it helps', p: 'Understand the trends shaping luxury-hotel content so your strategy follows evidence rather than guesswork.' },
    ],
  },
  leaderboard: {
    title: 'Leaderboard',
    blocks: [
      { h: 'What this is', p: 'Every tracked hotel ranked by engagement rate, with followers, posting cadence, last-posted date and certification-list membership.' },
      { h: 'How it works', p: 'Engagement rate = total (likes + comments) over the last 30 or 90 days — your choice via the toggle — ÷ followers × 100, so it rewards both strong posts and posting often. Sort any column, filter by region, search a hotel, or add one to your watchlist. Public Instagram data only — no reach or impressions.' },
      { h: 'Why it helps', p: 'Benchmark yourself against the field and spot who’s punching above their follower count — the hotels worth studying.' },
    ],
  },
  hotel: {
    title: 'Your hotel',
    blocks: [
      { h: 'What this is', p: 'Everything on this page is about your hotel only — the posts that beat your own typical (median) engagement, your numbers at a glance, and how your following and engagement have grown over your full posting history.' },
      { h: 'How it works', p: 'Public Instagram data only (likes + comments) — no reach, impressions, saves or shares. The single network-median line is the only comparison; there’s no rank anywhere.' },
      { h: 'Why it helps', p: 'A private read on your own performance, on the same measures as the rest of Content Radar. For now it shows a fictional example hotel — claiming your own hotel is coming soon.' },
    ],
  },
  saved: {
    title: 'Saved',
    blocks: [
      { h: 'What this is', p: 'Every post you’ve saved from Top posts, gathered in one place.' },
      { h: 'How it works', p: 'Saving a post adds it here; removing it here or on the dashboard keeps the two in sync.' },
      { h: 'Why it helps', p: 'Your personal shortlist of what’s worth borrowing, without scrolling the full list again.' },
    ],
  },
  watchlist: {
    title: 'Watchlist',
    blocks: [
      { h: 'What this is', p: 'The hotels you’re keeping an eye on.' },
      { h: 'How it works', p: 'Add hotels from the Leaderboard and they collect here.' },
      { h: 'Why it helps', p: 'Track a shortlist without scrolling the full portfolio every time — and their breakouts surface first on your dashboard.' },
    ],
  },
  settings: {
    title: 'Settings',
    blocks: [
      { h: 'What this is', p: 'Your plan and payment details.' },
      { h: 'How it works', p: 'Use Manage billing to update your card, see invoices, or cancel — it opens the secure Stripe portal.' },
      { h: 'Why it helps', p: 'Everything about your subscription in one place, handled securely by Stripe.' },
    ],
  },
  profile: {
    title: 'Profile',
    blocks: [
      { h: 'What this is', p: 'Your name and account details, used to personalise the dashboard.' },
      { h: 'How it works', p: 'Edit your details here; changes don’t affect billing — that lives under Settings.' },
      { h: 'Why it helps', p: 'Keeps the dashboard personal to you and your hotel.' },
    ],
  },
};

export default function PageInfoModal({
  open,
  infoKey,
  onClose,
}: {
  open: boolean;
  infoKey: InfoKey;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const c = CONTENT[infoKey];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`About this view — ${c.title}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(20,18,15,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-nav)',
          padding: '32px 34px 30px',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 30,
            height: 30,
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--body-mid)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* Eyebrow row — circled "i" badge + "About this view" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1.6px solid var(--signal-deep)',
              color: 'var(--signal-deep)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="7.4" r="1.25" fill="currentColor" />
              <path d="M12 11v6.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          </span>
          <span
            style={{
              fontFamily: LABEL,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: 'var(--muted)',
            }}
          >
            About this view
          </span>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)', lineHeight: 1.15, margin: '0 0 20px' }}>
          {c.title}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {c.blocks.map(blk => (
            <div key={blk.h}>
              <div
                style={{
                  fontFamily: LABEL,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--signal-deep)',
                  marginBottom: 6,
                }}
              >
                {blk.h}
              </div>
              <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.65, margin: 0 }}>{blk.p}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 26, textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-body), sans-serif',
              color: 'var(--on-dark)',
              background: 'var(--fill-strong)',
              border: 'none',
              borderRadius: 10,
              padding: '11px 22px',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

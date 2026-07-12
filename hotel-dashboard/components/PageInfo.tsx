'use client';

import { useEffect } from 'react';

// Biggish "explain this page" modal, opened from the left sidebar's "i" button.
// Content is keyed by the active view — for the dashboard that's the current
// section (driven by the URL hash), for the account pages it's the route.

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

const CONTENT: Record<InfoKey, { title: string; eyebrow: string; body: React.ReactNode }> = {
  overview: {
    eyebrow: 'This week',
    title: 'Your week at a glance',
    body: (
      <>
        The big number is how many posts — across all 200+ tracked hotels — beat{' '}
        <strong>their own hotel&rsquo;s typical (median) engagement by 2× or more</strong> in the last
        7 days. It&rsquo;s a like-for-like measure, so a small hotel outperforming itself counts the
        same as a giant.
        <br /><br />
        The panel on the right is the portfolio at a glance. Everything refreshes every week — use the
        left menu to jump into <strong>Top posts</strong>, <strong>What&rsquo;s working</strong> and
        the <strong>Leaderboard</strong>.
      </>
    ),
  },
  breakouts: {
    eyebrow: 'Top posts',
    title: 'The posts that broke out',
    body: (
      <>
        Every post here beat <strong>its own hotel&rsquo;s typical (median) engagement by 2× or
        more</strong> — so a small hotel punching above its weight ranks right next to a giant.
        <br /><br />
        <strong>How to use it:</strong> pick a time window (7 days / 30 days / all time) at the top,
        then use the filter chips to focus on Reels, images &amp; carousels, or hide collaboration
        posts. Hit <strong>Save</strong> on any post to keep it on your Saved page.
      </>
    ),
  },
  working: {
    eyebrow: "What's working",
    title: 'Patterns the leaders share',
    body: (
      <>
        Patterns shared by the best-performing content across <strong>all tracked hotels</strong> over
        the last 30 days — which <strong>formats, caption lengths, days and times</strong> correlate
        with higher engagement.
        <br /><br />
        <strong>How to use it:</strong> use it to shape your own posting mix, and open{' '}
        <em>Show more detail</em> for timing and frequency. These are correlations across the
        portfolio, not guarantees for any single account.
      </>
    ),
  },
  leaderboard: {
    eyebrow: 'Hotel leaderboard',
    title: 'Every hotel, ranked fairly',
    body: (
      <>
        Every tracked hotel ranked by <strong>engagement rate</strong> — mean (likes + comments) on
        its last 30 posts ÷ followers × 100 — so reach is measured fairly across follower sizes.
        <br /><br />
        <strong>How to use it:</strong> click any column to re-sort, search or filter by region, add a
        hotel to your <strong>Watchlist</strong>, and look for pins marking Forbes, Gold List,
        World&rsquo;s 50 Best or Michelin Keys hotels. A{' '}
        <span style={{ color: 'var(--signal-deep)' }}>⚠</span> flags a low-confidence figure.
      </>
    ),
  },
  hotel: {
    eyebrow: 'Your hotel',
    title: 'Your own hotel, mirrored back',
    body: (
      <>
        Everything on this page is about <strong>your hotel only</strong>: the posts that beat your
        own typical (median) engagement, your numbers at a glance, and how your following and
        engagement have grown over your full posting history.
        <br /><br />
        It&rsquo;s deliberately not a scoreboard — the single network-median line is the only
        comparison, and there&rsquo;s no rank anywhere. Public Instagram data only (likes +
        comments); we can&rsquo;t see reach, impressions, saves or shares.{' '}
        <strong>For now it shows a fictional example hotel</strong> — claiming your own hotel is
        coming soon.
      </>
    ),
  },
  saved: {
    eyebrow: 'Saved',
    title: 'Your saved posts',
    body: (
      <>
        Every post you&rsquo;ve saved from <strong>Top posts</strong>, gathered in one place. Saving a
        post adds it here; removing it here or on the dashboard keeps the two in sync — so this is your
        personal shortlist of what&rsquo;s worth borrowing.
      </>
    ),
  },
  watchlist: {
    eyebrow: 'Watchlist',
    title: 'The hotels you follow',
    body: (
      <>
        The hotels you&rsquo;re keeping an eye on. Add hotels from the{' '}
        <strong>Leaderboard</strong> and they collect here, so you can track a shortlist without
        scrolling the full portfolio every time.
      </>
    ),
  },
  settings: {
    eyebrow: 'Settings',
    title: 'Plan & billing',
    body: (
      <>
        Manage your plan and payment details here. Use <strong>Manage billing</strong> to update your
        card, see invoices, or cancel — it opens the secure Stripe portal.
      </>
    ),
  },
  profile: {
    eyebrow: 'Profile',
    title: 'Your account details',
    body: (
      <>
        Your name and account details, used to personalise the dashboard. Changes here don&rsquo;t
        affect your billing — that lives under <strong>Settings</strong>.
      </>
    ),
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
      aria-label={c.title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(20,18,15,0.55)',
        backdropFilter: 'blur(2px)',
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
          maxWidth: 600,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          boxShadow: '0 30px 70px -24px rgba(20,18,15,0.5)',
          padding: '34px 38px 38px',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--signal-deep)',
            marginBottom: 12,
          }}
        >
          {c.eyebrow}
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '0 0 16px', maxWidth: 460 }}>
          {c.title}
        </h2>
        <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--body-strong)' }}>{c.body}</div>
      </div>
    </div>
  );
}

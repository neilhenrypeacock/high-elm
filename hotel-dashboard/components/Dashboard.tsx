'use client';

import { useEffect, useState } from 'react';
import type { DashboardData, HotelRow } from '@/lib/data';
import { fmtFollowers } from '@/lib/format';
import ContentRadar from './ContentRadar';
import WhatsWorkingPanel from './WhatsWorking';
import HotelTable from './HotelTable';

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";
const DISPLAY = "var(--font-display), 'Space Grotesk', sans-serif";

// The lists every tracked hotel is drawn from — shown on the overview so members
// can see the sourcing is the industry's own, not ours.
const SOURCES: { name: string; sub: string }[] = [
  { name: 'Forbes Travel Guide', sub: 'Five-star list' },
  { name: 'Condé Nast Traveller', sub: 'Gold List' },
  { name: 'The World’s 50 Best Hotels', sub: 'Annual ranking' },
  { name: 'Michelin Keys', sub: 'UK & Ireland' },
];

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
const normHandle = (h: string) => h.trim().toLowerCase().replace(/^@/, '').replace(/\/+$/, '');

// Content width cap applied inside every band
const INNER: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  paddingLeft: 40,
  paddingRight: 40,
};

// Auto-generated "This week in focus" bullets, derived live from the data:
// this-week breakout highlights + the portfolio's current 30-day patterns.
function pluralFormat(label: string): string {
  const map: Record<string, string> = { Reel: 'Reels', Video: 'Videos', Carousel: 'Carousels', Photo: 'Photos' };
  return map[label] ?? `${label}s`;
}
function captionPhrase(label: string): string {
  const map: Record<string, string> = {
    Short: 'Shorter captions',
    Medium: 'Medium-length captions',
    Long: 'Longer captions',
  };
  return map[label] ?? `${label} captions`;
}
function topBar(items: { label: string; value: number }[]) {
  return items.length ? [...items].sort((a, b) => b.value - a.value)[0] : null;
}

function weekInFocus(data: DashboardData): React.ReactNode[] {
  const bullets: React.ReactNode[] = [];
  const strong = { color: '#F7F6F2', fontWeight: 600 } as const;

  const top = data.standout['7d']?.[0];
  if (top) {
    bullets.push(
      <>
        <span style={strong}>{top.hotel_name}</span>{' '}posted the week&rsquo;s biggest breakout —{' '}
        <span style={strong}>{top.multiplier.toFixed(1)}×</span>{' '}its usual engagement.
      </>,
    );
  }
  if (data.super_breakout_count > 0) {
    bullets.push(
      <>
        <span style={strong}>{data.super_breakout_count}</span>{' '}
        {data.super_breakout_count === 1 ? 'post' : 'posts'} cleared{' '}
        <span style={strong}>10×</span>{' '}their hotel&rsquo;s usual engagement this week.
      </>,
    );
  }
  const fmt = topBar(data.whatsWorking.by_format);
  if (fmt && fmt.value > 0) {
    bullets.push(
      <>
        <span style={strong}>{pluralFormat(fmt.label)}</span>{' '}are the portfolio&rsquo;s strongest
        format right now — {fmt.value.toFixed(1)}% median engagement.
      </>,
    );
  }
  const cap = topBar(data.whatsWorking.by_caption);
  if (cap && cap.value > 0) {
    bullets.push(
      <>
        <span style={strong}>{captionPhrase(cap.label)}</span>{' '}are pulling the most engagement.
      </>,
    );
  }
  const day = topBar(data.whatsWorking.by_day);
  if (day && day.value > 0) {
    bullets.push(
      <>
        <span style={strong}>{day.label}</span>{' '}is the strongest day to post across the portfolio.
      </>,
    );
  }
  return bullets.slice(0, 5);
}

// Shared panel chrome for the two lower overview cards (watchlist / sources).
const PANEL: React.CSSProperties = {
  border: '1px solid rgba(245,240,232,0.13)',
  borderRadius: 14,
  background: 'var(--panel-dark)',
  overflow: 'hidden',
};
const PANEL_LABEL: React.CSSProperties = {
  fontFamily: LABEL,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: 'var(--muted-dark)',
};

// ─── Your watchlist — the member's followed hotels, or an empty-state nudge ────
function WatchlistPanel({ hotels, handles }: { hotels: HotelRow[]; handles: string[] }) {
  const wanted = new Set(handles.map(normHandle));
  const rows = hotels.filter(h => wanted.has(normHandle(h.instagram_handle)));

  return (
    <div style={PANEL}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '22px 26px',
          borderBottom: '1px solid rgba(245,240,232,0.10)',
        }}
      >
        <span style={PANEL_LABEL}>Your watchlist</span>
        <a
          href="#leaderboard"
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--signal-light)',
            textDecoration: 'none',
          }}
        >
          Manage →
        </a>
      </div>

      {rows.length > 0 ? (
        <div>
          {rows.map((h, i) => {
            const followersStr = fmtFollowers(h.followers_count);
            const sub = [h.region, followersStr !== '—' ? `${followersStr} followers` : null]
              .filter(Boolean)
              .join(' · ');
            const note = h.engagement_rate != null ? `${h.engagement_rate.toFixed(2)}% eng.` : null;
            return (
              <div
                key={h.instagram_handle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 26px',
                  borderBottom: i < rows.length - 1 ? '1px solid rgba(245,240,232,0.08)' : 'none',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: 'none',
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'rgba(245,240,232,0.06)',
                    color: 'var(--signal-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {nameInitials(h.name)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#F7F6F2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.name}
                  </span>
                  {sub && (
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted-dark)', marginTop: 1 }}>
                      {sub}
                    </span>
                  )}
                </span>
                {note && <span style={{ fontSize: 13, color: '#CFC9BE', textAlign: 'right' }}>{note}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '40px 26px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 14,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '1px solid rgba(245,240,232,0.16)',
              color: 'var(--signal-light)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <div style={{ maxWidth: 360 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#F7F6F2', marginBottom: 6 }}>
              Nothing on your watchlist yet
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#A49D92', margin: 0 }}>
              Follow the hotels you care about and their breakouts surface here first, every week.
            </p>
          </div>
          <a
            href="#leaderboard"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink)',
              background: '#F7F6F2',
              borderRadius: 10,
              padding: '10px 20px',
              textDecoration: 'none',
            }}
          >
            Browse the leaderboard →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Sources crawled — the industry lists every tracked hotel is drawn from ────
function SourcesPanel() {
  return (
    <div style={PANEL}>
      <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(245,240,232,0.10)' }}>
        <div style={{ ...PANEL_LABEL, marginBottom: 8 }}>Sources crawled</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#A49D92', margin: 0, maxWidth: 560 }}>
          You don’t have to trust us — just the lists the industry already trusts. Every tracked hotel is
          drawn from these.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '20px 26px 24px' }}>
        {SOURCES.map(src => (
          <span
            key={src.name}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: 2,
              background: 'rgba(245,240,232,0.05)',
              border: '1px solid rgba(245,240,232,0.13)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: '#F7F6F2', lineHeight: 1.2 }}>{src.name}</span>
            <span
              style={{
                fontFamily: LABEL,
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--muted-dark)',
              }}
            >
              {src.sub}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── This week — full-screen dark signal band ─────────────────────────────────
function Hero({ data, watchlistHandles }: { data: DashboardData; watchlistHandles: string[] }) {
  const stats = [
    { figure: <>{data.hotel_count}<span style={{ color: 'var(--signal)' }}>+</span></>, caption: '5-star hotels' },
    { figure: <>{data.countries_count}</>, caption: 'Countries' },
    { figure: <>{data.total_posts_analysed.toLocaleString('en-GB')}</>, caption: 'Posts analysed' },
    { figure: <>{data.week_ending}</>, caption: 'Week ending' },
  ];
  const focus = weekInFocus(data);

  return (
    <div
      id="overview"
      style={{
        background: 'var(--ink-deep)',
        color: '#F7F6F2',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="cr-inner"
        style={{ ...INNER, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 52, paddingTop: 56, paddingBottom: 56 }}
      >
        {/* ── Headline ── */}
        <div>
          <div
            style={{
              fontFamily: LABEL,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.24em',
              color: 'var(--muted-dark)',
              marginBottom: 26,
            }}
          >
            This week · Instagram
          </div>

          {data.breakout_count > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 26, flexWrap: 'wrap' }}>
                <span
                  className="cr-display cr-hero-numeral"
                  style={{ fontSize: 156, lineHeight: 0.78, letterSpacing: '-0.04em', color: 'var(--signal)' }}
                >
                  {data.breakout_count}
                </span>
                <span style={{ fontSize: 30, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2, paddingTop: 10 }}>
                  {data.breakout_count === 1 ? 'post' : 'posts'} significantly<br />outperformed
                </span>
              </div>
              <p style={{ maxWidth: 520, fontSize: 15, lineHeight: 1.75, color: '#A49D92', marginTop: 26 }}>
                Beating their hotel&rsquo;s own median this week
                {data.super_breakout_count > 0 ? (
                  <>
                    {' '}— and <span style={{ color: '#F7F6F2' }}>{data.super_breakout_count}</span> cleared
                    ten times their usual engagement
                  </>
                ) : null}
                {' '}— refreshed every week.
              </p>
            </>
          ) : (
            <p style={{ fontSize: 30, lineHeight: 1.4, maxWidth: 560, margin: 0 }}>
              No posts significantly outperformed their hotel&rsquo;s own median this week.
            </p>
          )}
        </div>

        {/* ── Lower grid: by the numbers · this week in focus ── */}
        <div
          className="cr-hero-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 24, alignItems: 'stretch' }}
        >
          {/* By the numbers */}
          <div
            style={{
              border: '1px solid rgba(245,240,232,0.13)',
              borderRadius: 14,
              background: 'var(--panel-dark)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--muted-dark)',
                padding: '22px 26px',
                borderBottom: '1px solid rgba(245,240,232,0.10)',
              }}
            >
              This week · by the numbers
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(245,240,232,0.10)' }}>
              {stats.map(s => (
                <div key={s.caption} style={{ background: 'var(--panel-dark)', padding: '22px 26px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{s.figure}</div>
                  <div
                    style={{
                      fontFamily: LABEL,
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: 'var(--muted-dark)',
                      marginTop: 5,
                    }}
                  >
                    {s.caption}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* This week in focus — auto analysis */}
          <div
            style={{
              border: '1px solid rgba(245,240,232,0.13)',
              borderRadius: 14,
              background: 'var(--panel-dark)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--muted-dark)',
                padding: '22px 26px',
                borderBottom: '1px solid rgba(245,240,232,0.10)',
              }}
            >
              This week · in focus
            </div>
            {focus.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: '10px 26px 22px', display: 'flex', flexDirection: 'column' }}>
                {focus.map((b, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      padding: '13px 0',
                      borderBottom: i < focus.length - 1 ? '1px solid rgba(245,240,232,0.08)' : 'none',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--signal-light)', marginTop: 7 }}
                    />
                    <span style={{ fontSize: 14, lineHeight: 1.6, color: '#CFC9BE' }}>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ padding: '22px 26px', fontSize: 14, color: '#A49D92', lineHeight: 1.6 }}>
                Not enough data this week to surface highlights yet — check back after the next scrape.
              </div>
            )}
          </div>
        </div>

        {/* ── Your watchlist ── */}
        <WatchlistPanel hotels={data.hotels} handles={watchlistHandles} />

        {/* ── Sources crawled ── */}
        <SourcesPanel />
      </div>
    </div>
  );
}

// ─── Section model ────────────────────────────────────────────────────────────
// The dashboard is a set of switchable panels rather than one long scroll. The
// active panel is driven by the URL hash so the LEFT SIDEBAR's section links
// (#overview / #breakouts / #working / #leaderboard) select the view — there is
// no top nav. Only the active section is mounted, so each scrolls on its own.
// Per-section explanations now live behind the sidebar's "i" (About this view).
const SECTION_IDS = ['overview', 'breakouts', 'working', 'leaderboard'] as const;
type SectionId = (typeof SECTION_IDS)[number];

function readHash(): SectionId {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace(/^#/, '');
  return (SECTION_IDS.includes(h as SectionId) ? h : 'overview') as SectionId;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard({
  data,
  regions,
  savedPostKeys = [],
  watchlistHandles = [],
}: {
  data: DashboardData;
  regions: string[];
  savedPostKeys?: string[];
  watchlistHandles?: string[];
}) {
  // Server renders the default; the client reconciles to the hash after mount and
  // then follows hashchange (fired by the sidebar's section links).
  const [active, setActive] = useState<SectionId>('overview');

  useEffect(() => {
    const sync = () => {
      setActive(readHash());
      window.scrollTo({ top: 0 });
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const sectionPad: React.CSSProperties = { ...INNER, paddingTop: 40, paddingBottom: 48 };

  return (
    <div className="cr-board">
      {/* ── This week (overview) ── */}
      {active === 'overview' && <Hero data={data} watchlistHandles={watchlistHandles} />}

      {/* ── Top posts — filters then posts, no heading copy ── */}
      {active === 'breakouts' && (
        <div className="cr-inner" style={sectionPad}>
          <ContentRadar postsByWindow={data.standout} savedPostKeys={savedPostKeys} />
        </div>
      )}

      {/* ── What's working ── */}
      {active === 'working' && (
        <div className="cr-inner" style={sectionPad}>
          <WhatsWorkingPanel data={data.whatsWorkingData} frequency={data.frequency} />
        </div>
      )}

      {/* ── Hotel leaderboard ── */}
      {active === 'leaderboard' && (
        <div className="cr-inner" style={sectionPad}>
          <HotelTable hotels={data.hotels} regions={regions} watchlistHandles={watchlistHandles} />
        </div>
      )}

      {/* Footer is provided by AppShell (shared across all gated pages). */}
    </div>
  );
}

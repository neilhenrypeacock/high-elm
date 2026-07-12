'use client';

import { useEffect, useState } from 'react';
import type { DashboardData } from '@/lib/data';
import ContentRadar from './ContentRadar';
import WhatsWorkingPanel from './WhatsWorking';
import HotelTable from './HotelTable';

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";

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

// ─── This week — full-screen dark signal band ─────────────────────────────────
function Hero({ data }: { data: DashboardData }) {
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
      {active === 'overview' && <Hero data={data} />}

      {/* ── Top posts — filters then posts, no heading copy ── */}
      {active === 'breakouts' && (
        <div className="cr-inner" style={sectionPad}>
          <ContentRadar postsByWindow={data.standout} savedPostKeys={savedPostKeys} />
        </div>
      )}

      {/* ── What's working ── */}
      {active === 'working' && (
        <div className="cr-inner" style={sectionPad}>
          <WhatsWorkingPanel
            whatsWorking={data.whatsWorking}
            snapshot={data.snapshot}
            frequency={data.frequency}
          />
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

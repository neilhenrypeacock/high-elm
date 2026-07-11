'use client';

import { useEffect, useState } from 'react';
import type { DashboardData } from '@/lib/data';
import ContentRadar from './ContentRadar';
import WhatsWorkingPanel from './WhatsWorking';
import HotelTable from './HotelTable';

const LABEL = "var(--font-label), 'Space Mono', monospace";

// Content width cap applied inside every band
const INNER: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  paddingLeft: 40,
  paddingRight: 40,
};

// ─── Hero — dark signal band ──────────────────────────────────────────────────
function Hero({ data }: { data: DashboardData }) {
  const stats = [
    { figure: <>{data.hotel_count}<span style={{ color: 'var(--signal)' }}>+</span></>, caption: '5-star hotels' },
    { figure: <>{data.countries_count}</>, caption: 'Countries' },
    { figure: <>{data.total_posts_analysed.toLocaleString('en-GB')}</>, caption: 'Posts analysed' },
    { figure: <>{data.week_ending}</>, caption: 'Week ending' },
  ];

  return (
    <div id="overview" style={{ background: 'var(--ink-deep)', color: '#F7F6F2' }}>
      <div className="cr-inner" style={{ ...INNER, paddingTop: 72, paddingBottom: 76 }}>
        <div
          className="cr-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          {/* Left — the signal */}
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, flexWrap: 'wrap' }}>
                  <span
                    className="cr-display cr-hero-numeral"
                    style={{ fontSize: 132, lineHeight: 0.8, letterSpacing: '-0.04em', color: 'var(--signal)' }}
                  >
                    {data.breakout_count}
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.25, paddingTop: 8 }}>
                    {data.breakout_count === 1 ? 'post' : 'posts'} significantly<br />outperformed
                  </span>
                </div>
                <p style={{ maxWidth: 440, fontSize: 14, lineHeight: 1.75, color: '#A49D92', marginTop: 24 }}>
                  Their hotel&rsquo;s own median this week
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
              <p style={{ fontSize: 26, lineHeight: 1.4, maxWidth: 560, margin: 0 }}>
                No posts significantly outperformed their hotel&rsquo;s own median this week.
              </p>
            )}
          </div>

          {/* Right — by the numbers */}
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
                padding: '24px 28px',
                borderBottom: '1px solid rgba(245,240,232,0.10)',
              }}
            >
              This week · by the numbers
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                background: 'rgba(245,240,232,0.10)',
              }}
            >
              {stats.map(s => (
                <div key={s.caption} style={{ background: 'var(--panel-dark)', padding: '24px 28px' }}>
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

'use client';

import { useState } from 'react';
import type { DashboardData, OutlierPost, WhatsWorkingSet } from '@/lib/data';
import ContentRadar from './ContentRadar';
import WhatsWorkingPanel from './WhatsWorking';
import HotelTable from './HotelTable';
import TopHotels from './TopHotels';
import Lockup from './Lockup';

// Content padding / max-width applied inside every band
const INNER: React.CSSProperties = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '0 clamp(20px, 4vw, 56px)',
};

// ─── Platform toggle ──────────────────────────────────────────────────────────
function PlatformToggle() {
  const platforms = [
    { label: 'Instagram',          active: true },
    { label: 'TikTok coming soon', active: false },
    { label: 'YouTube coming soon',active: false },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--raised)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '3px 4px',
        gap: 2,
      }}
    >
      {platforms.map(p => (
        <div
          key={p.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 999,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 500,
            background: p.active ? 'var(--ink)' : 'transparent',
            color: p.active ? '#fff' : 'var(--faint)',
            cursor: p.active ? 'default' : 'not-allowed',
            userSelect: 'none',
          }}
        >
          {p.active && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--signal)',
                flexShrink: 0,
                animation: 'signalPulse 2.4s ease-in-out infinite',
              }}
            />
          )}
          {p.label}
        </div>
      ))}
      <style>{`
        @keyframes signalPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.55; transform:scale(.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes signalPulse { 0%,100% { opacity:1; } }
        }
      `}</style>
    </div>
  );
}

// ─── Time-window filter ───────────────────────────────────────────────────────
function TimeWindowFilter() {
  const windows = [
    { label: 'Last 7 days',              active: true,  soon: false },
    { label: 'Last 14 days coming soon', active: false, soon: true  },
    { label: 'Last 30 days coming soon', active: false, soon: true  },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: '3px 4px',
        gap: 2,
      }}
    >
      {windows.map(w => (
        <div
          key={w.label}
          title={w.soon ? 'Coming soon — we need more historical data first' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 6,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--font-mono), monospace',
            background: w.active ? 'var(--ink)' : 'transparent',
            color: w.active ? '#fff' : 'var(--faint)',
            cursor: w.soon ? 'not-allowed' : 'default',
            opacity: w.soon ? 0.55 : 1,
            userSelect: 'none',
          }}
        >
          {w.label}
        </div>
      ))}
    </div>
  );
}

// ─── Trend bullets computed from live data ────────────────────────────────────
function computeTrends(standout: OutlierPost[], whatsWorking: WhatsWorkingSet): string[] {
  const trends: string[] = [];

  if (standout.length > 0) {
    const peak = standout[0].multiplier;
    if (peak >= 3) {
      trends.push(`The top post reached ${peak.toFixed(0)}× its hotel's typical engagement.`);
    } else {
      const fmtCount: Record<string, number> = {};
      for (const p of standout) fmtCount[p.type ?? 'Other'] = (fmtCount[p.type ?? 'Other'] ?? 0) + 1;
      const [[topFmt, topFmtN]] = Object.entries(fmtCount).sort((a, b) => b[1] - a[1]);
      if (topFmtN > 1) {
        const pct = Math.round((topFmtN / standout.length) * 100);
        trends.push(`${topFmt} posts made up ${pct}% of breakouts this week.`);
      }
    }
  }

  if (whatsWorking.by_day.length > 0) {
    const DAY_FULL: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
    const topDay = [...whatsWorking.by_day].sort((a, b) => b.value - a.value)[0];
    const dayName = DAY_FULL[topDay.label] ?? topDay.label;
    trends.push(`${dayName}s delivered the strongest engagement across the portfolio.`);
  }

  if (whatsWorking.by_format.length > 0) {
    const sorted = [...whatsWorking.by_format].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const fmtLabel = top.label === 'Reel' ? 'Reels' : `${top.label} posts`;
    const total = sorted.reduce((s, d) => s + d.count, 0);
    const topPct = total > 0 ? Math.round((top.count / total) * 100) : 0;
    trends.push(`${fmtLabel} led on engagement rate${topPct > 0 ? ` and made up ${topPct}% of posts analysed` : ''}.`);
  }

  if (whatsWorking.by_hour_block.length > 0) {
    const topBlock = [...whatsWorking.by_hour_block].sort((a, b) => b.value - a.value)[0];
    trends.push(`Posts in the ${topBlock.label.toLowerCase()} tended to see the highest engagement.`);
  }

  return trends;
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ hotelCount, countriesCount, postsCount, weekEnding }: {
  hotelCount: number; countriesCount: number; postsCount: number; weekEnding: string;
}) {
  const stats = [
    { value: `${hotelCount}+`, label: '5 star hotels' },
    { value: `${countriesCount}`,  label: 'countries' },
    { value: postsCount.toLocaleString(), label: 'posts analysed' },
    { value: weekEnding, label: 'week ending' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px 40px',
        padding: '14px 0',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {stats.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontWeight: 500,
              fontSize: 14,
              color: 'var(--ink)',
              letterSpacing: '-.01em',
            }}
          >
            {s.value}
          </span>
          <span style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.14em', fontFamily: 'var(--font-mono), monospace', fontWeight: 500 }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ title, sub, eyebrow }: { title: string; sub?: string; eyebrow?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {eyebrow && (
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--muted)', marginBottom: 10 }}>
          {eyebrow}
        </div>
      )}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-.02em',
          margin: 0,
        }}
      >
        {title}
      </h2>
      {sub && (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>{sub}</p>
      )}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: 'var(--line)', margin: '64px 0' }} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FilteredDashboard({ data, regions }: { data: DashboardData; regions: string[] }) {
  const [, setTick] = useState(0);
  void setTick;

  const active = data.filters.all;
  const trends = computeTrends(active.standout, active.whatsWorking);

  return (
    <>
      {/* ══ Band 1: Top bar — surface ══════════════════════════════════════ */}
      <div
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={INNER}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              gap: 16,
            }}
          >
            <Lockup variant="secondary" size={22} />
            <PlatformToggle />
          </div>
        </div>
      </div>

      {/* ══ Band 2: Signal band — inverse / dark ═══════════════════════════ */}
      <div style={{ background: 'var(--inverse)' }}>
        <div style={INNER}>
          <div style={{ paddingTop: 56, paddingBottom: 64 }}>
            {/* Tagline */}
            <p
              style={{
                fontSize: 13,
                color: 'rgba(247,246,242,0.45)',
                lineHeight: 1.65,
                maxWidth: 560,
                marginBottom: 40,
              }}
            >
              A live ideas library built from the world&rsquo;s best-performing hotel content — updated every week so your team always knows what&rsquo;s actually working.
            </p>

            {/* Kicker */}
            <div
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono), monospace',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '.14em',
                color: 'var(--signal-light)',
                marginBottom: 20,
              }}
            >
              This week
            </div>

            {/* Hero display */}
            {active.breakout_count > 0 ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 20,
                    flexWrap: 'wrap',
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: 88,
                      fontFamily: 'var(--font-mono), monospace',
                      fontWeight: 700,
                      color: 'var(--signal)',
                      lineHeight: 1,
                    }}
                  >
                    {active.breakout_count}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      color: '#F7F6F2',
                      fontFamily: 'var(--font-mono), monospace',
                    }}
                  >
                    {active.breakout_count === 1 ? 'post' : 'posts'} significantly outperformed
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 18,
                    color: 'rgba(247,246,242,.6)',
                    lineHeight: 1.55,
                    maxWidth: 580,
                    margin: 0,
                  }}
                >
                  their hotel&rsquo;s own average this week
                  {active.super_breakout_count > 0 ? (
                    <> — and{' '}
                      <span style={{ color: 'var(--signal-light)' }}>{active.super_breakout_count}</span>
                      {' '}cleared ten times their usual engagement.
                    </>
                  ) : (
                    <>. Content choices, not account size, did the work.</>
                  )}
                </p>
              </>
            ) : (
              <p
                style={{
                  fontSize: 22,
                  color: '#F7F6F2',
                  lineHeight: 1.55,
                  maxWidth: 620,
                  margin: 0,
                }}
              >
                No posts significantly outperformed their hotel&rsquo;s own normal this week.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ══ Band 3: Primary content — bg-sunken ═══════════════════════════ */}
      <div style={INNER}>
        <div style={{ paddingTop: 40 }}>

          {/* Stats bar */}
          <StatsBar
            hotelCount={active.hotel_count}
            countriesCount={active.countries_count}
            postsCount={active.posts_count}
            weekEnding={data.week_ending}
          />

          {/* Time-window toggle */}
          <div style={{ marginTop: 20, marginBottom: 48 }}>
            <TimeWindowFilter />
          </div>

          {/* Two columns: takeaway bullets | top hotels */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)',
              gap: 32,
              marginBottom: 0,
              alignItems: 'start',
            }}
            className="overview-grid"
          >
            {trends.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {trends.map((t, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14, lineHeight: 1.65, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--signal-deep)', flexShrink: 0, fontWeight: 700, fontFamily: 'var(--font-mono), monospace' }}>→</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}
            <TopHotels hotels={data.topHotels} />
          </div>

          <Divider />

          {/* Breakout posts */}
          <section style={{ marginBottom: 0 }}>
            <SectionHeading
              eyebrow="Content that stood out"
              title="Breakout posts"
              sub="Posts that outperformed the hotel's own median by 2× or more · last 7 days"
            />
            <ContentRadar posts={active.standout} />
          </section>

          <Divider />

          {/* What's working */}
          <section>
            <SectionHeading
              eyebrow="Portfolio patterns"
              title="What's working"
              sub="Patterns across the portfolio — median engagement by format, caption length, day, and time of day."
            />
            <WhatsWorkingPanel
              active={active.whatsWorking}
              baseline={undefined}
              snapshot={active.snapshot}
              allSnapshot={active.snapshot}
              frequency={data.frequency}
              filterKey="all"
            />
          </section>

          <Divider />

          {/* Hotel leaderboard */}
          <section style={{ marginBottom: 0 }}>
            <SectionHeading
              eyebrow="Ranked by engagement rate"
              title="Hotel leaderboard"
              sub="Click any column to re-sort."
            />
            <HotelTable hotels={data.hotels} regions={regions} />
          </section>

          <Divider />

          {/* About */}
          <div style={{ maxWidth: 680, paddingBottom: 0 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 10px' }}>
              The Content Radar — powered by High Elm Studio — tracks Instagram performance across the world&rsquo;s most prestigious and followed luxury hotels. Every week you get a snapshot of content that significantly outperforms the average, giving marketing teams a continuously updated library of what&rsquo;s genuinely working in hotel content.
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Use it to benchmark against the wider category, spot repeatable content patterns, and build a library of ideas worth adapting for your own channels — grounded in real engagement data, not follower size.
            </p>
          </div>

        </div>
      </div>

      {/* ══ Band 4: Footer — inverse / dark ═══════════════════════════════ */}
      <footer style={{ background: 'var(--inverse)', marginTop: 80 }}>
        <div style={INNER}>
          <div style={{ paddingTop: 48, paddingBottom: 48 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 24,
                marginBottom: 28,
              }}
            >
              <Lockup variant="primary" size={22} onDark />
              <p
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono), monospace',
                  color: 'rgba(247,246,242,0.4)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                Data updates weekly
              </p>
            </div>
            <p
              style={{
                fontSize: 11,
                color: 'rgba(247,246,242,0.3)',
                lineHeight: 1.7,
                maxWidth: 640,
                margin: 0,
              }}
            >
              Built on public Instagram data only: followers, likes, comments, captions, post types, dates.
              No reach, impressions, saves or shares — those are private to each account.
              &ldquo;What&apos;s working&rdquo; and the overview reflect patterns the leaders share, not guarantees.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Floating request-feature button ──────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 50 }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--ink)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '11px 20px',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(32,32,26,.22)',
            letterSpacing: '-.01em',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--signal-deep)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Request a feature
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .overview-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

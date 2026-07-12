'use client';

import { useState } from 'react';
import { ImageWithFallback, TagChip, TypeIcon } from './ContentRadar';
import { AccreditationPins } from './HotelTable';
import { fmtFollowers } from '@/lib/format';
import {
  BREAKOUT_HIGHLIGHT,
  type ComparisonPeriod,
  type GrowthSeries,
  type PeriodPost,
  type YourBreakout,
  type YourHotelData,
} from '@/lib/your-hotel-demo';

// "Your Hotel" — the page a logged-in hotel social manager sees about THEIR OWN
// hotel. An encouraging mirror ("here's what's working for you, do more of it"),
// NOT a scoreboard: the single network-median line is the only comparison, and
// there is no rank anywhere. Reuses the dashboard's card/tile/chip idioms —
// design signed off from the mockup pass (2026-07-12) before this build.
//
// Currently renders DEMO DATA (lib/your-hotel-demo.ts) and says so in the UI.
// Hotel claiming + the full-history scrape are separate passes.

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";
const DISPLAY = "var(--font-display), 'Space Grotesk', sans-serif";

// Content width cap applied inside every band (same as Dashboard.tsx)
const INNER: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  paddingLeft: 40,
  paddingRight: 40,
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: LABEL,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: 'var(--muted)',
      }}
    >
      {children}
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 style={{ fontSize: 21, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0 }}>
        {title}
      </h2>
      {intro && (
        <p style={{ fontSize: 15, color: 'var(--body-soft)', lineHeight: 1.7, maxWidth: 620, margin: 0 }}>
          {intro}
        </p>
      )}
    </div>
  );
}

function Rule() {
  return <hr style={{ border: 0, borderTop: '1px solid var(--line-rule)', margin: 0 }} />;
}

// ─── 1 · Header strip ─────────────────────────────────────────────────────────
function HeaderStrip({ hotel }: { hotel: YourHotelData }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '34px 0 6px' }}>
      <div
        aria-hidden="true"
        style={{
          flex: 'none',
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--top3-tint)',
          border: '1px solid var(--line)',
          color: 'var(--signal-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '-0.02em',
        }}
      >
        {hotel.name.replace(/^The\s+/i, '').charAt(0)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 27, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {hotel.name}
          </span>
          <span
            title="Hotel claiming is coming soon — this page shows a fictional example hotel with realistic numbers."
            style={{
              fontFamily: LABEL,
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--muted)',
              background: 'var(--surface-alt-2)',
              border: '1px solid var(--line)',
              borderRadius: 5,
              padding: '3px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            Example data
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
          @{hotel.handle} · {hotel.location}
        </div>
        <div
          style={{
            fontFamily: LABEL,
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--faint)',
            marginTop: 9,
          }}
        >
          Last updated {hotel.lastUpdated} · {hotel.postCount} posts · full history since {hotel.historySince}
        </div>
        <AccreditationPins labels={hotel.accreditations} />
      </div>
    </div>
  );
}

// ─── 2 · Your breakout card (mirrors ContentRadar's BreakoutCard, relabelled
//        "your typical post" — this page is the hotel's own mirror) ───────────
function YourBreakoutCard({ post: p, followers }: { post: YourBreakout; followers: number }) {
  const statCells = [
    { label: 'Likes', value: p.likes, mult: p.likesMultiple, typical: p.typicalLikes },
    { label: 'Comments', value: p.comments, mult: p.commentsMultiple, typical: p.typicalComments },
  ];

  return (
    <div
      className="cr-lift"
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="cr-card-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.9fr) 1.1fr' }}>
        {/* Media — demo posts have no image yet, so ImageWithFallback renders the
            scene gradient; real image URLs will slot straight in. */}
        <div
          className="cr-card-media"
          style={{ position: 'relative', minHeight: 400, height: '100%', overflow: 'hidden', background: p.gradient }}
        >
          <ImageWithFallback src={null} alt={p.scene} fallback={p.gradient} />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(120% 90% at 50% 30%, transparent 40%, rgba(20,16,12,0.42) 100%)',
            }}
          />
          <span style={{ position: 'absolute', top: 14, left: 14 }}>
            <TagChip type={p.format} />
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              right: 14,
              fontSize: 12,
              fontStyle: 'italic',
              color: 'rgba(247,246,242,0.82)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {p.scene}
          </span>
        </div>

        {/* Content */}
        <div className="cr-card-body" style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <span
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 60,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'var(--signal-deep)',
              }}
            >
              {p.multiplier.toFixed(1)}×
            </span>
            <span
              style={{
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--muted)',
                lineHeight: 1.5,
                paddingBottom: 6,
              }}
            >
              your typical
              <br />
              post
            </span>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.45 }}>
              &ldquo;{p.caption}&rdquo;
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {fmtFollowers(followers)} followers · {p.posted}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              background: 'var(--line)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              overflow: 'hidden',
              marginTop: 4,
            }}
          >
            {statCells.map(cell => (
              <div key={cell.label} style={{ background: 'var(--surface-alt)', padding: '16px 18px' }}>
                <div
                  style={{
                    fontFamily: LABEL,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--faint)',
                    marginBottom: 7,
                  }}
                >
                  {cell.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                    {cell.value.toLocaleString('en-GB')}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--signal-deep)' }}>
                    ↑{cell.mult.toFixed(1)}×
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 5 }}>
                  vs typical {cell.typical.toLocaleString('en-GB')}
                </div>
              </div>
            ))}
          </div>

          <span style={{ marginTop: 'auto', fontSize: 12, fontWeight: 500, color: 'var(--faint)' }}>
            View on Instagram ↗ (links with real data)
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 3 · Stat tiles (mirrors WhatsWorking's dark stat strip) ──────────────────
function StatTiles({ hotel }: { hotel: YourHotelData }) {
  const s = hotel.stats;
  const tileStyle: React.CSSProperties = {
    background: 'var(--ink)',
    color: 'var(--surface)',
    padding: '24px 24px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 128,
    textDecoration: 'none',
  };
  const capStyle: React.CSSProperties = {
    fontFamily: LABEL,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.13em',
    color: 'var(--on-dark-soft)',
    lineHeight: 1.5,
    marginTop: 'auto',
  };
  const figStyle: React.CSSProperties = {
    fontFamily: DISPLAY,
    fontWeight: 800,
    fontSize: 34,
    lineHeight: 1,
    color: 'var(--signal)',
  };
  const subStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: 'var(--muted-dark)',
    marginTop: 5,
    letterSpacing: 0,
    textTransform: 'none',
    fontWeight: 400,
  };

  return (
    <div
      className="cr-stat-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        background: 'rgba(245,240,232,0.12)',
        border: '1px solid var(--ink)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div style={tileStyle}>
        <span style={figStyle}>{s.posts90d}</span>
        <span style={capStyle}>Posts in the last 90 days</span>
      </div>
      <div style={tileStyle}>
        <span style={figStyle}>{s.typicalEngagement.toLocaleString('en-GB')}</span>
        <span style={capStyle}>
          Your typical post
          <span style={subStyle}>Median likes + comments</span>
        </span>
      </div>
      <a href={s.bestPostUrl} target="_blank" rel="noopener noreferrer" className="cr-yh-tile-link" style={tileStyle}>
        <span style={figStyle}>
          {s.bestOnRecord.toLocaleString('en-GB')}{' '}
          <span style={{ fontSize: 20, color: 'var(--signal-light)' }}>↗</span>
        </span>
        <span style={capStyle}>
          Your best post on record
          <span style={subStyle}>Across your full history · likes + comments</span>
        </span>
      </a>
      <div style={tileStyle}>
        <span style={figStyle}>{s.engagementRate.toFixed(1)}%</span>
        <span style={capStyle}>Your engagement rate</span>
      </div>
    </div>
  );
}

// ─── 4 · One honest benchmark line ────────────────────────────────────────────
function Benchmark({ hotel }: { hotel: YourHotelData }) {
  const { er, networkMedianEr } = hotel.benchmark;
  const above = er >= networkMedianEr;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        background: 'var(--top3-tint)',
        border: '1px solid #CFE0D6',
        borderRadius: 14,
        padding: '22px 26px',
      }}
    >
      <span
        aria-hidden="true"
        style={{ flex: 'none', width: 9, height: 9, borderRadius: '50%', background: 'var(--signal)', marginTop: 8 }}
      />
      <div>
        <div style={{ fontSize: 17, color: 'var(--ink)', lineHeight: 1.55, letterSpacing: '-0.005em' }}>
          Your engagement rate is{' '}
          <b style={{ fontWeight: 700, color: 'var(--signal-deep)' }}>{er.toFixed(1)}%</b>
          {above ? (
            <>
              {' '}— a touch above the network median of{' '}
              <b style={{ fontWeight: 700, color: 'var(--signal-deep)' }}>{networkMedianEr.toFixed(1)}%</b>. A strong
              base to build on.
            </>
          ) : (
            <>
              {' '}— the network median is{' '}
              <b style={{ fontWeight: 700, color: 'var(--signal-deep)' }}>{networkMedianEr.toFixed(1)}%</b>. Closing
              that gap is exactly what the patterns below are for.
            </>
          )}
        </div>
        <div
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--muted)',
            marginTop: 8,
          }}
        >
          The only comparison we show — no rankings, no leaderboard position
        </div>
      </div>
    </div>
  );
}

// ─── 5 · Growth chart (inline SVG, chart-card idiom from WhatsWorking) ────────
function GrowthChart({
  id,
  title,
  unit,
  series,
}: {
  /** Unique per instance — namespaces the SVG gradient id. */
  id: string;
  title: string;
  /** Axis label format: 'k' (thousands) or '%' (percent). */
  unit: 'k' | '%';
  series: GrowthSeries;
}) {
  const W = 560, H = 200, pL = 6, pR = 50, pT = 14, pB = 26;
  const { values, min, max } = series;
  const n = values.length;
  const X = (i: number) => pL + (i / (n - 1)) * (W - pL - pR);
  const Y = (v: number) => pT + (1 - (v - min) / (max - min)) * (H - pT - pB);

  const line = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const area = `M${X(0).toFixed(1)} ${Y(min).toFixed(1)} ${values
    .map((v, i) => `L${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)
    .join(' ')} L${X(n - 1).toFixed(1)} ${Y(min).toFixed(1)} Z`;

  const rows = [0, 1, 2, 3, 4];
  const fmtY = (v: number) => (unit === '%' ? `${v.toFixed(1)}%` : `${Math.round(v)}k`);
  const lastX = X(n - 1), lastY = Y(values[n - 1]);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: '22px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h3
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            fontWeight: 400,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--muted)',
            margin: 0,
          }}
        >
          {title}
        </h3>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          {series.headline}
          <span style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--signal-deep)', marginLeft: 8, letterSpacing: 0 }}>
            {series.delta}
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.ariaLabel} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--signal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {rows.map(r => {
          const gy = pT + (r / 4) * (H - pT - pB);
          return <line key={r} x1={pL} y1={gy} x2={W - pR} y2={gy} stroke="var(--track)" strokeWidth="1" />;
        })}
        <path d={area} fill={`url(#${id}-g)`} />
        <path d={line} fill="none" stroke="var(--signal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="8" fill="var(--signal-deep)" opacity="0.15" />
        <circle cx={lastX} cy={lastY} r="4" fill="var(--signal-deep)" />
        <text x={W - pR + 9} y={Y(max) + 3.5} fontSize="10" fill="var(--faint)">{fmtY(max)}</text>
        <text x={W - pR + 9} y={Y(min) + 3.5} fontSize="10" fill="var(--faint)">{fmtY(min)}</text>
        {series.xLabels.map(t => (
          <text key={t.l} x={X(t.i)} y={H - 7} textAnchor="middle" fontSize="10" fill="var(--faint)">
            {t.l}
          </text>
        ))}
      </svg>

      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--signal-deep)', lineHeight: 1.55 }}>{series.note}</p>
    </div>
  );
}

// ─── 6 · Comparison: what was breaking out vs what you posted ─────────────────
function PeriodPostRow({ post: p }: { post: PeriodPost }) {
  const up = p.vsTypical >= BREAKOUT_HIGHLIGHT;
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span
        style={{
          position: 'relative',
          width: 58,
          height: 58,
          borderRadius: 8,
          flexShrink: 0,
          overflow: 'hidden',
          background: p.gradient,
          boxShadow: 'inset 0 0 0 1px rgba(38,36,32,0.06)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            width: 18,
            height: 18,
            borderRadius: 4,
            background: 'rgba(20,18,15,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F7F6F2',
          }}
        >
          <TypeIcon type={p.format} />
        </span>
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.caption}
        </span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
          {p.likes.toLocaleString('en-GB')} likes · {p.comments} comments
        </span>
      </span>
      <span
        style={{
          fontFamily: LABEL,
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          textAlign: 'right',
          color: up ? 'var(--signal-deep)' : 'var(--faint)',
        }}
      >
        {p.vsTypical.toFixed(1)}×
        <br />
        your typical
      </span>
    </div>
  );
}

type CompareMode = 'week' | 'month';

function Comparison({ hotel }: { hotel: YourHotelData }) {
  // Month is the default landing view (Neil, 2026-07-12): the reflective read
  // first; week is the sharper one-moment view, one tap away.
  const [mode, setMode] = useState<CompareMode>('month');
  const [idx, setIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const periods = hotel.comparison[mode];
  const period: ComparisonPeriod = periods[Math.min(idx, periods.length - 1)];

  // Three best of the period first; month view can expand to every post.
  const ranked = [...period.yours].sort((a, b) => b.vsTypical - a.vsTypical);
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const expandable = mode === 'month' && rest.length > 0;

  const switchMode = (m: CompareMode) => {
    if (m === mode) return;
    setMode(m);
    setIdx(0);
    setShowAll(false);
  };
  const t = period.trend;

  return (
    <div>
      {/* Granularity toggle — same visual as ContentRadar's WindowToggle */}
      <div
        role="group"
        aria-label="Compare by week or month"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--surface-alt-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: 3,
          gap: 2,
          marginBottom: 16,
        }}
      >
        {(['week', 'month'] as const).map(m => {
          const active = m === mode;
          return (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              aria-pressed={active}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                border: 'none',
                borderRadius: 6,
                padding: '6px 13px',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'inherit',
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--surface)' : 'var(--muted)',
                cursor: active ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />}
              {m === 'week' ? 'By week' : 'By month'}
            </button>
          );
        })}
      </div>

      {/* Period chips */}
      <div role="group" aria-label="Choose a period" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {periods.map((p, i) => {
          const active = i === idx;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => { setIdx(i); setShowAll(false); }}
              aria-pressed={active}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                border: `1px solid ${active ? 'var(--signal-deep)' : 'var(--line)'}`,
                background: active ? 'var(--top3-tint)' : 'var(--surface)',
                color: active ? 'var(--signal-deep)' : 'var(--muted)',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12.5,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: active ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.12s, color 0.12s, border-color 0.12s',
              }}
            >
              {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Two columns: the network's breakout vs your posts */}
      <div className="cr-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--signal)', flex: 'none' }} />
            <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--signal-deep)' }}>
              Breaking out across luxury hotels
            </span>
          </div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ position: 'relative', height: 240, background: t.gradient }}>
              <ImageWithFallback src={null} alt={t.scene} fallback={t.gradient} />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(120% 90% at 50% 30%, transparent 40%, rgba(20,16,12,0.42) 100%)',
                }}
              />
              <span style={{ position: 'absolute', top: 14, left: 14 }}>
                <TagChip type={t.format} />
              </span>
              <span
                style={{
                  position: 'absolute',
                  bottom: 14,
                  left: 14,
                  right: 14,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: 'rgba(247,246,242,0.82)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                {t.scene}
              </span>
            </div>
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, color: 'var(--signal-deep)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {t.multiplier.toFixed(1)}×
                </span>
                <span style={{ fontFamily: LABEL, fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>
                  vs their own median
                </span>
              </span>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.42 }}>
                &ldquo;{t.caption}&rdquo;
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {t.hotelName} · @{t.handle} · {t.place}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--body-strong)' }}>
                {t.likes.toLocaleString('en-GB')} likes · {t.comments.toLocaleString('en-GB')} comments
              </span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--faint)', flex: 'none' }} />
            <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)' }}>
              What you posted that {mode}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {top.map(p => (
              <PeriodPostRow key={p.caption} post={p} />
            ))}
            {expandable && showAll && rest.map(p => <PeriodPostRow key={p.caption} post={p} />)}
            {expandable && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="cr-expander"
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 2,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  color: 'var(--signal-deep)',
                  background: 'var(--surface)',
                  border: '1px solid #CDD8D3',
                  borderRadius: 10,
                  padding: '10px 16px',
                  cursor: 'pointer',
                }}
              >
                {showAll ? 'Show fewer ↑' : `Show all ${ranked.length} posts that month ↓`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Takeaway */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          background: 'var(--ink)',
          color: 'var(--on-dark)',
          borderRadius: 14,
          padding: '22px 26px',
          marginTop: 20,
        }}
      >
        <span
          style={{
            flex: 'none',
            fontFamily: LABEL,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--signal-light)',
            paddingTop: 3,
          }}
        >
          Takeaway
        </span>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#E4DED3', margin: 0 }}>
          {period.insight.text} <b style={{ color: '#fff', fontWeight: 600 }}>{period.insight.action}</b>
        </p>
      </div>
    </div>
  );
}

// ─── 7 · What's working for you ───────────────────────────────────────────────
function WorkingForYou({ hotel }: { hotel: YourHotelData }) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: '8px 26px',
      }}
    >
      {hotel.working.map((w, i) => (
        <li
          key={w.strong}
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            padding: '18px 0',
            borderBottom: i < hotel.working.length - 1 ? '1px solid var(--line-soft)' : 'none',
          }}
        >
          <span
            aria-hidden="true"
            style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', marginTop: 8 }}
          />
          <p style={{ fontSize: 14.5, color: 'var(--body-strong)', lineHeight: 1.65, margin: 0 }}>
            <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{w.strong}</b> {w.rest}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function YourHotel({ hotel }: { hotel: YourHotelData }) {
  const sectionPad: React.CSSProperties = { ...INNER, paddingTop: 44, paddingBottom: 44 };

  return (
    <div>
      <div className="cr-inner" style={INNER}>
        <HeaderStrip hotel={hotel} />
      </div>

      {/* 2 · Breakouts — the hero of the page */}
      <div className="cr-inner" style={{ ...sectionPad, paddingTop: 34 }}>
        <SectionHead
          eyebrow="Your breakouts"
          title="The posts that beat your own average"
          intro={
            <>
              These outperformed your <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>typical post</strong>{' '}
              over the last 90 days. This is your signal —{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>do more of these.</strong>
            </>
          }
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {hotel.breakouts.map(p => (
            <YourBreakoutCard key={p.caption} post={p} followers={hotel.followers} />
          ))}
        </div>
      </div>

      <div className="cr-inner" style={INNER}><Rule /></div>

      {/* 3 · Numbers at a glance + 4 · the one honest benchmark */}
      <div className="cr-inner" style={sectionPad}>
        <SectionHead eyebrow="Your numbers" title="At a glance" />
        <StatTiles hotel={hotel} />
        <div style={{ marginTop: 24 }}>
          <Benchmark hotel={hotel} />
        </div>
      </div>

      <div className="cr-inner" style={INNER}><Rule /></div>

      {/* 5 · Growth over time */}
      <div className="cr-inner" style={sectionPad}>
        <SectionHead
          eyebrow="Your growth"
          title="The long view"
          intro={
            <>
              Because this is your hotel, we read your{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>whole posting history</strong> — not just
              recent weeks. Here&rsquo;s the shape of it.
            </>
          }
        />
        <div className="cr-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <GrowthChart id="yh-followers" title="Followers over time" unit="k" series={hotel.growth.followers} />
          <GrowthChart id="yh-er" title="Engagement rate over time" unit="%" series={hotel.growth.er} />
        </div>
      </div>

      <div className="cr-inner" style={INNER}><Rule /></div>

      {/* 6 · What was breaking out vs what you posted */}
      <div className="cr-inner" style={sectionPad}>
        <SectionHead
          eyebrow="Learn from each period"
          title="What was breaking out — and what you posted"
          intro={
            <>
              On the left is a post breaking out across luxury hotels then; on the right, the posts{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>you</strong> published around the same time.
              Switch between <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>week</strong> and{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>month</strong> to zoom from a single moment to
              the bigger pattern.
            </>
          }
        />
        <Comparison hotel={hotel} />
      </div>

      <div className="cr-inner" style={INNER}><Rule /></div>

      {/* 7 · What's working for you */}
      <div className="cr-inner" style={sectionPad}>
        <SectionHead eyebrow="What's working for you" title="Patterns in your own breakouts" />
        <WorkingForYou hotel={hotel} />
      </div>

      {/* Honesty note (page-level; the shared AppFooter follows via AppShell) */}
      <div className="cr-inner" style={{ ...INNER, paddingBottom: 44 }}>
        <p style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.75, maxWidth: 720, margin: 0 }}>
          <b style={{ color: 'var(--body-mid)', fontWeight: 600 }}>Public Instagram data only — likes and comments.</b>{' '}
          Because this is your own hotel, we read your full public history — every post we can see. We still
          don&rsquo;t show reach, impressions, saves or shares: those aren&rsquo;t public.{' '}
          <b style={{ color: 'var(--body-mid)', fontWeight: 600 }}>&ldquo;Best on record&rdquo;</b> means the best
          across that history in public data — posts where Instagram hides the likes can&rsquo;t be counted. The only
          benchmark on this page is the single network-median line above — there&rsquo;s no ranking or league position
          here.
        </p>
      </div>
    </div>
  );
}

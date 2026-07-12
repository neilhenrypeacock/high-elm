'use client';

import { useState } from 'react';
import type { WhatsWorkingData, WwScope, WwStat, WwObservation, BarItem, OutlierPost } from '@/lib/data';
import { fmtFollowers, fmtPostedAt } from '@/lib/format';
import { ImageWithFallback } from './ContentRadar';

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";
const DISPLAY = "var(--font-display), 'Space Grotesk', sans-serif";
const THUMB_PLACEHOLDER = 'linear-gradient(135deg, #2f2b26, #3d382f)';

// Bar ramp: strongest bar takes the signal green, the rest fade back.
const BAR_RAMP = ['var(--signal)', 'var(--bar-mid)', 'var(--bar-low)', 'var(--bar-low)', 'var(--bar-low)'];

const SCOPES: { key: WwScope; label: string }[] = [
  { key: 'month', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
];

// Delta line colour by direction (on the dark stat bar).
const DELTA_COLOR: Record<WwStat['dir'], string> = {
  up: 'var(--signal-light)',
  down: '#D98A80',
  flat: 'var(--muted-dark)',
};
const DELTA_ARROW: Record<WwStat['dir'], string> = { up: '↑', down: '↓', flat: '' };

function permalink(p: OutlierPost): string {
  return p.post_url ?? `https://www.instagram.com/p/${p.post_id}/`;
}

function barColors(data: BarItem[]): Record<string, string> {
  const byValue = [...data].sort((a, b) => b.value - a.value);
  const colors: Record<string, string> = {};
  byValue.forEach((d, i) => {
    colors[d.label] = BAR_RAMP[Math.min(i, BAR_RAMP.length - 1)];
  });
  return colors;
}

function gapLine(data: BarItem[], noun: string): string | null {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (!worst.value) return null;
  const ratio = best.value / worst.value;
  if (ratio < 1.15) return null;
  return `${best.label} ${noun} get ~${ratio.toFixed(1)}× more engagement than ${worst.label.toLowerCase()}.`;
}

function BarChart({ data }: { data: BarItem[] }) {
  const colors = barColors(data);
  const max = Math.max(...data.map(d => d.value), 0.001);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>{d.label}</span>
            <span style={{ fontSize: 11.5 }}>
              <span style={{ color: 'var(--body-mid)', fontWeight: 600 }}>{d.value.toFixed(2)}%</span>
              <span style={{ color: 'var(--faint)' }}> · n={d.count}</span>
            </span>
          </div>
          <div style={{ height: 7, background: 'var(--track)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(d.value / max) * 100}%`,
                background: colors[d.label],
                borderRadius: 4,
                transition: 'width 400ms ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: '22px 24px' }}>
      <h3 style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 18 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function GapNote({ text }: { text: string | null }) {
  if (!text) return null;
  return <p style={{ marginTop: 16, fontSize: 12, color: 'var(--signal-deep)', lineHeight: 1.5 }}>{text}</p>;
}

// Section eyebrow (uppercase micro-label above a block).
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', margin: '34px 0 14px' }}>
      {children}
    </div>
  );
}

function ScopeToggle({ value, onChange }: { value: WwScope; onChange: (s: WwScope) => void }) {
  return (
    <div
      role="group"
      aria-label="Analysis period"
      style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--surface-alt-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}
    >
      {SCOPES.map(s => {
        const active = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            aria-pressed={active}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              border: 'none',
              borderRadius: 6,
              padding: '7px 15px',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'inherit',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--surface)' : 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />}
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function StatBar({ stats }: { stats: WwStat[] }) {
  return (
    <div
      className="cr-stat-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: 1,
        background: 'rgba(245,240,232,0.12)',
        border: '1px solid var(--ink)',
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 28,
      }}
    >
      {stats.map(s => (
        <div key={s.caption} style={{ background: 'var(--ink)', color: 'var(--surface)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, lineHeight: 1, color: 'var(--signal)' }}>{s.figure}</span>
          <span style={{ fontFamily: LABEL, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.13em', color: 'var(--muted-dark)', lineHeight: 1.4 }}>
            {s.caption}
          </span>
          <span style={{ fontSize: 11.5, color: DELTA_COLOR[s.dir], marginTop: 2 }}>
            {DELTA_ARROW[s.dir] ? `${DELTA_ARROW[s.dir]} ` : ''}{s.delta}
          </span>
        </div>
      ))}
    </div>
  );
}

function ObservationCard({ o }: { o: WwObservation }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-card)', padding: 24 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 38, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--signal-deep)' }}>{o.stat}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginTop: 14, lineHeight: 1.3 }}>{o.title}</div>
      <p style={{ fontSize: 13, color: 'var(--body-strong)', lineHeight: 1.6, marginTop: 8 }}>{o.text}</p>
    </div>
  );
}

function BestPostRow({ post: p, rank }: { post: OutlierPost; rank: number }) {
  const followersStr = fmtFollowers(p.hotel_followers);
  const meta = [p.hotel_country, followersStr !== '—' ? `${followersStr} followers` : null].filter(Boolean).join(' · ');
  const showType = !!p.type && p.type !== 'Other';

  return (
    <a
      href={permalink(p)}
      target="_blank"
      rel="noopener noreferrer"
      className="cr-post-row"
      style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 24px', borderBottom: '1px solid var(--line-soft)', textDecoration: 'none', color: 'inherit' }}
    >
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: 'var(--faint)', width: 26, flexShrink: 0 }}>
        {String(rank).padStart(2, '0')}
      </span>
      <span style={{ position: 'relative', width: 64, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: THUMB_PLACEHOLDER }}>
        <ImageWithFallback src={p.image_url} alt={p.hotel_name} fallback={THUMB_PLACEHOLDER} blur={10} elevated={false} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.hotel_name}
        </span>
        {meta && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{meta}</span>}
      </span>
      {showType && (
        <span className="cr-row-date" style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', width: 80, textAlign: 'right', flexShrink: 0 }}>
          {p.type}
        </span>
      )}
      <span style={{ width: 64, textAlign: 'right', flexShrink: 0 }}>
        <span style={{ display: 'block', fontSize: 18, fontWeight: 700, color: 'var(--signal-deep)' }}>{p.multiplier.toFixed(1)}×</span>
        <span style={{ display: 'block', fontFamily: LABEL, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--faint)' }}>
          vs median
        </span>
      </span>
    </a>
  );
}

export default function WhatsWorkingPanel({
  data,
  frequency,
}: {
  data: WhatsWorkingData;
  frequency: { top10_ppw: number; rest_ppw: number };
}) {
  const [scope, setScope] = useState<WwScope>('month');
  const [showDetail, setShowDetail] = useState(false);
  const d = data[scope];

  return (
    <div>
      {/* Header — title + lede on the left, period toggle on the right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginTop: 6 }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: 12 }}>
            Portfolio analysis
          </div>
          <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)', lineHeight: 1.15 }}>
            What&rsquo;s working across the portfolio
          </h2>
          <p style={{ fontSize: 14, color: 'var(--body-soft)', lineHeight: 1.7, marginTop: 12 }}>{d.lede}</p>
        </div>
        <ScopeToggle value={scope} onChange={s => { setScope(s); setShowDetail(false); }} />
      </div>

      {/* Month-in-review stat bar */}
      <StatBar stats={d.stats} />

      {/* What we're seeing — observation cards */}
      {d.observations.length > 0 && (
        <>
          <Eyebrow>What we&rsquo;re seeing</Eyebrow>
          <div className="cr-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {d.observations.map(o => (
              <ObservationCard key={o.title} o={o} />
            ))}
          </div>
        </>
      )}

      {/* Best posts of the period */}
      {d.bestPosts.length > 0 && (
        <>
          <Eyebrow>{d.bestPostsTitle}</Eyebrow>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            {d.bestPosts.map((p, i) => (
              <BestPostRow key={`${p.post_id}-${p.instagram_handle}`} post={p} rank={i + 1} />
            ))}
          </div>
        </>
      )}

      {/* Supporting signals — format + caption bars */}
      <Eyebrow>Supporting signals</Eyebrow>
      <div className="cr-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Engagement by post format">
          <BarChart data={d.set.by_format} />
          <GapNote text={gapLine(d.set.by_format, 'posts')} />
        </ChartCard>
        <ChartCard title="Engagement by caption length">
          <BarChart data={d.set.by_caption} />
          <GapNote text={gapLine(d.set.by_caption, 'captions')} />
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--faint)' }}>Short &lt;100 chars · Medium 100–299 · Long 300+.</p>
        </ChartCard>
      </div>

      {/* Expander — frequency + timing detail (kept by Neil's decision) */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={() => setShowDetail(v => !v)}
          className="cr-expander"
          style={{ fontSize: 12, fontWeight: 500, fontFamily: 'inherit', color: 'var(--signal-deep)', background: 'var(--surface)', border: '1px solid #CDD8D3', borderRadius: 10, padding: '11px 24px', cursor: 'pointer' }}
        >
          {showDetail ? 'Hide detail ↑' : 'Show more detail ↓'}
        </button>
      </div>

      {showDetail && (
        <div className="cr-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          <ChartCard title="Does posting more help?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--body-mid)', marginBottom: 7 }}>Top 10 hotels (by engagement rate)</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, lineHeight: 1, color: 'var(--signal-deep)' }}>
                  {frequency.top10_ppw.toFixed(1)}
                  <span style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>posts/week</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--body-mid)', marginBottom: 7 }}>Rest of portfolio</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>
                  {frequency.rest_ppw.toFixed(1)}
                  <span style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>posts/week</span>
                </div>
              </div>
            </div>
            <p style={{ marginTop: 22, fontSize: 12, color: 'var(--faint)' }}>Correlation only — other factors drive engagement too.</p>
          </ChartCard>

          <ChartCard title="When do posts perform best?">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--body-mid)', marginBottom: 12 }}>By day of week</div>
              <BarChart data={d.set.by_day} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--body-mid)', marginBottom: 12 }}>By time of day</div>
              <BarChart data={d.set.by_hour_block} />
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--faint)' }}>Times are UTC — day-of-week is more reliable than hour.</p>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

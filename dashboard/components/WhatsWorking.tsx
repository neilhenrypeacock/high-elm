'use client';

import { useState } from 'react';
import type { WhatsWorkingSet, BarItem, Snapshot } from '@/lib/data';
import { fmtFollowers } from '@/lib/format';

const LABEL = "var(--font-label), 'Space Mono', monospace";
const DISPLAY = "var(--font-display), 'Baloo 2', sans-serif";

// Bar ramp: strongest bar takes the teal signal, the rest fade back
const BAR_RAMP = ['var(--signal)', 'var(--bar-mid)', 'var(--bar-low)', 'var(--bar-low)', 'var(--bar-low)'];

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <span style={{ fontSize: 14, color: 'var(--ink)' }}>{d.label}</span>
            <span style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--body-mid)' }}>{d.value.toFixed(2)}%</span>
              <span style={{ color: 'var(--faint)' }}> · n={d.count}</span>
            </span>
          </div>
          <div style={{ height: 9, background: 'var(--track)', borderRadius: 5, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(d.value / max) * 100}%`,
                background: colors[d.label],
                borderRadius: 5,
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
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: '28px 32px',
      }}
    >
      <h3
        style={{
          fontFamily: LABEL,
          fontSize: 10,
          fontWeight: 400,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'var(--muted)',
          marginBottom: 22,
        }}
      >
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

// Dynamic section intro — names the winning format + caption length from live data.
// Static window: the last 30 days (the time-window toggle now drives Top posts).
function Intro({ whatsWorking, snapshot }: { whatsWorking: WhatsWorkingSet; snapshot: Snapshot }) {
  const topFormat = [...whatsWorking.by_format].sort((a, b) => b.value - a.value)[0];
  const topCaption = [...whatsWorking.by_caption].sort((a, b) => b.value - a.value)[0];
  if (!topFormat && !topCaption && snapshot.median_er === null) return null;

  const strong: React.CSSProperties = { color: 'var(--ink)', fontWeight: 600 };
  const captionWord = topCaption
    ? { Short: 'shorter captions', Medium: 'medium-length captions', Long: 'longer captions' }[topCaption.label] ?? null
    : null;

  return (
    <p style={{ fontSize: 14, color: 'var(--body-soft)', lineHeight: 1.7, maxWidth: 560, marginTop: 8 }}>
      {topFormat && (
        <>
          <span style={strong}>{topFormat.label === 'Reel' ? 'Reels' : `${topFormat.label.toLowerCase()} posts`}</span>
          {captionWord ? (
            <>
              {' '}and <span style={strong}>{captionWord}</span>
            </>
          ) : null}{' '}
          are earning the highest median engagement across the portfolio&rsquo;s last 30 days of
          posts{snapshot.median_er !== null ? <> — the median engagement rate is {snapshot.median_er.toFixed(2)}%</> : null}
          . Patterns the leaders share — correlation, not guarantees.
        </>
      )}
    </p>
  );
}

export default function WhatsWorkingPanel({
  whatsWorking,
  snapshot,
  frequency,
}: {
  whatsWorking: WhatsWorkingSet;
  snapshot: Snapshot;
  frequency: { top10_ppw: number; rest_ppw: number };
}) {
  const [showDetail, setShowDetail] = useState(false);

  const stats = [
    { caption: 'Median engagement rate', figure: snapshot.median_er !== null ? `${snapshot.median_er.toFixed(2)}%` : '—' },
    { caption: 'Median posts / week', figure: snapshot.median_ppw !== null ? snapshot.median_ppw.toFixed(1) : '—' },
    { caption: 'Median followers', figure: fmtFollowers(snapshot.median_followers).toLowerCase() },
  ];

  return (
    <div>
      <Intro whatsWorking={whatsWorking} snapshot={snapshot} />

      {/* Three dark stat cards */}
      <div
        className="cr-stat-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 32 }}
      >
        {stats.map(s => (
          <div
            key={s.caption}
            style={{ background: 'var(--ink)', color: 'var(--surface)', borderRadius: 14, padding: '24px 28px' }}
          >
            <div
              style={{
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: 'var(--muted-dark)',
                marginBottom: 12,
              }}
            >
              {s.caption}
            </div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, lineHeight: 1, color: 'var(--signal)' }}>
              {s.figure}
            </div>
          </div>
        ))}
      </div>

      {/* Format + caption charts */}
      <div
        className="cr-chart-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}
      >
        <ChartCard title="Engagement by post format">
          <BarChart data={whatsWorking.by_format} />
          <GapNote text={gapLine(whatsWorking.by_format, 'posts')} />
        </ChartCard>
        <ChartCard title="Engagement by caption length">
          <BarChart data={whatsWorking.by_caption} />
          <GapNote text={gapLine(whatsWorking.by_caption, 'captions')} />
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--faint)' }}>
            Short &lt;100 chars · Medium 100–299 · Long 300+.
          </p>
        </ChartCard>
      </div>

      {/* Expander for timing + frequency detail */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={() => setShowDetail(v => !v)}
          className="cr-expander"
          style={{
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'inherit',
            color: 'var(--signal-deep)',
            background: 'var(--surface)',
            border: '1px solid #CDD8D3',
            borderRadius: 10,
            padding: '11px 24px',
            cursor: 'pointer',
          }}
        >
          {showDetail ? 'Hide detail ↑' : 'Show more detail ↓'}
        </button>
      </div>

      {showDetail && (
        <div
          className="cr-chart-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}
        >
          <ChartCard title="Does posting more help?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--body-mid)', marginBottom: 7 }}>
                  Top 10 hotels (by engagement rate)
                </div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, lineHeight: 1, color: 'var(--signal-deep)' }}>
                  {frequency.top10_ppw.toFixed(1)}
                  <span style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>
                    posts/week
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--body-mid)', marginBottom: 7 }}>Rest of portfolio</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>
                  {frequency.rest_ppw.toFixed(1)}
                  <span style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>
                    posts/week
                  </span>
                </div>
              </div>
            </div>
            <p style={{ marginTop: 22, fontSize: 12, color: 'var(--faint)' }}>
              Correlation only — other factors drive engagement too.
            </p>
          </ChartCard>

          <ChartCard title="When do posts perform best?">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--body-mid)', marginBottom: 12 }}>
                By day of week
              </div>
              <BarChart data={whatsWorking.by_day} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--body-mid)', marginBottom: 12 }}>
                By time of day
              </div>
              <BarChart data={whatsWorking.by_hour_block} />
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--faint)' }}>
              Times are UTC — day-of-week is more reliable than hour.
            </p>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

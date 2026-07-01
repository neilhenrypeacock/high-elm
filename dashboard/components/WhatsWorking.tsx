'use client';

import { useState } from 'react';
import type { WhatsWorkingSet, BarItem, Snapshot, FilterKey } from '@/lib/data';

function fmtFollowers(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return n.toString();
}

function gapLine(data: BarItem[], noun: string): string | null {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const best   = sorted[0];
  const worst  = sorted[sorted.length - 1];
  if (!worst.value) return null;
  const ratio = best.value / worst.value;
  if (ratio < 1.15) return null;
  return `${best.label} ${noun} get about ${ratio.toFixed(1)}× more engagement than ${worst.label}.`;
}

function BarChart({
  data,
  baseline,
  unit = '%',
}: {
  data: BarItem[];
  baseline?: BarItem[];
  unit?: string;
}) {
  const baselineMap: Record<string, number> = baseline
    ? Object.fromEntries(baseline.map(b => [b.label, b.value]))
    : {};
  const max = Math.max(...data.map(d => d.value), 0.001);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map(d => {
        const bl = baselineMap[d.label];
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 400 }}>{d.label}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {d.value.toFixed(2)}{unit}
                {bl !== undefined && (
                  <span style={{ marginLeft: 6, opacity: 0.55 }}>(All: {bl.toFixed(2)}{unit})</span>
                )}
                <span style={{ marginLeft: 5, opacity: 0.45 }}>n={d.count}</span>
              </span>
            </div>
            {/* Track */}
            <div
              style={{
                height: 10,
                borderRadius: 6,
                overflow: 'hidden',
                background: 'var(--card-soft)',
                border: '1px solid var(--line)',
              }}
            >
              {/* Bar */}
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, var(--signal-deep) 0%, var(--signal) 100%)',
                  borderRadius: 6,
                  transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            </div>
            {/* Baseline marker */}
            {bl !== undefined && (
              <div
                style={{
                  position: 'relative',
                  height: 0,
                  marginTop: -10,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${(bl / max) * 100}%`,
                    top: 0,
                    width: 2,
                    height: 10,
                    background: 'rgba(32,32,26,.2)',
                    borderRadius: 1,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 18,
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow)',
        padding: '24px 24px 20px',
      }}
    >
      <h3
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: 'var(--faint)',
          marginBottom: 20,
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
  return (
    <p
      style={{
        marginTop: 14,
        fontSize: 12,
        fontStyle: 'italic',
        color: 'var(--signal)',
        lineHeight: 1.5,
      }}
    >
      {text}
    </p>
  );
}

function SnapshotCard({ label, value, baseline }: { label: string; value: string; baseline?: string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow)',
        padding: '16px 18px',
      }}
    >
      <div style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontWeight: 500,
          fontSize: 22,
          color: 'var(--ink)',
          lineHeight: 1,
          letterSpacing: '-.01em',
        }}
      >
        {value}
      </div>
      {baseline && (
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 5 }}>All: {baseline}</div>
      )}
    </div>
  );
}

function buildProseSummary(
  active: WhatsWorkingSet,
  snapshot: Snapshot,
  frequency: { top10_ppw: number; rest_ppw: number },
): string {
  const parts: string[] = [];

  if (snapshot.median_er !== null) {
    parts.push(`The portfolio is averaging a ${snapshot.median_er.toFixed(2)}% median engagement rate.`);
  }

  if (active.by_format.length > 0) {
    const top = [...active.by_format].sort((a, b) => b.value - a.value)[0];
    const label = top.label === 'Reel' ? 'Reels' : `${top.label} posts`;
    parts.push(`${label} are driving the highest engagement across the portfolio.`);
  }

  if (active.by_day.length > 0) {
    const topDay = [...active.by_day].sort((a, b) => b.value - a.value)[0];
    parts.push(`${topDay.label}s consistently deliver the strongest results.`);
  }

  if (active.by_caption.length > 0) {
    const topCaption = [...active.by_caption].sort((a, b) => b.value - a.value)[0];
    parts.push(`${topCaption.label} captions tend to outperform longer or shorter alternatives.`);
  }

  const freqGap = frequency.top10_ppw / Math.max(frequency.rest_ppw, 0.1);
  if (freqGap >= 1.2) {
    parts.push(`Top hotels post around ${frequency.top10_ppw.toFixed(1)} times per week — roughly ${freqGap.toFixed(1)}× more than the rest of the portfolio.`);
  }

  return parts.join(' ');
}

export default function WhatsWorkingPanel({
  active,
  baseline,
  snapshot,
  allSnapshot,
  frequency,
  filterKey,
}: {
  active: WhatsWorkingSet;
  baseline?: WhatsWorkingSet;
  snapshot: Snapshot;
  allSnapshot: Snapshot;
  frequency: { top10_ppw: number; rest_ppw: number };
  filterKey: FilterKey;
}) {
  const showBaseline = filterKey !== 'all';
  const [showDetail, setShowDetail] = useState(false);
  const prose = buildProseSummary(active, snapshot, frequency);

  return (
    <div>
      {/* Prose summary */}
      {prose && (
        <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.7, marginBottom: 28, maxWidth: 720 }}>
          {prose}
        </p>
      )}

      {/* Snapshot numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SnapshotCard
          label="Median ER"
          value={snapshot.median_er !== null ? `${snapshot.median_er.toFixed(2)}%` : '—'}
          baseline={showBaseline && allSnapshot.median_er !== null ? `${allSnapshot.median_er.toFixed(2)}%` : undefined}
        />
        <SnapshotCard
          label="Median posts/wk"
          value={snapshot.median_ppw !== null ? `${snapshot.median_ppw.toFixed(1)}` : '—'}
          baseline={showBaseline && allSnapshot.median_ppw !== null ? `${allSnapshot.median_ppw.toFixed(1)}` : undefined}
        />
        <SnapshotCard
          label="Median followers"
          value={fmtFollowers(snapshot.median_followers)}
          baseline={showBaseline ? fmtFollowers(allSnapshot.median_followers) : undefined}
        />
      </div>

      {/* Always-visible: format + caption */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Panel title="Engagement by post format">
          <BarChart data={active.by_format} baseline={baseline?.by_format} />
          <GapNote text={gapLine(active.by_format, 'posts')} />
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--faint)' }}>Median engagement rate per post, by format.</p>
        </Panel>

        <Panel title="Engagement by caption length">
          <BarChart data={active.by_caption} baseline={baseline?.by_caption} />
          <GapNote text={gapLine(active.by_caption, 'captions')} />
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--faint)' }}>Short &lt;100 chars · Medium 100–300 · Long &gt;300.</p>
        </Panel>
      </div>

      {/* Expand toggle */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={() => setShowDetail(v => !v)}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '8px 24px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          {showDetail ? 'Hide detail ↑' : 'Show more detail ↓'}
        </button>
      </div>

      {/* Collapsible: posting frequency + timing */}
      {showDetail && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ marginTop: 20 }}>
          <Panel title="Does posting more help?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.04em' }}>
                  Top 10 hotels (by engagement rate)
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontWeight: 500,
                    fontSize: 28,
                    color: 'var(--signal)',
                    lineHeight: 1,
                    letterSpacing: '-.01em',
                  }}
                >
                  {frequency.top10_ppw.toFixed(1)}
                  <span style={{ fontSize: 14, fontWeight: 400, fontStyle: 'normal', color: 'var(--muted)', marginLeft: 6 }}>
                    posts/week
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.04em' }}>
                  Rest of portfolio
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: 32,
                    color: 'var(--ink)',
                    lineHeight: 1,
                    letterSpacing: '-.02em',
                  }}
                >
                  {frequency.rest_ppw.toFixed(1)}
                  <span style={{ fontSize: 14, fontWeight: 400, fontStyle: 'normal', color: 'var(--muted)', marginLeft: 6 }}>
                    posts/week
                  </span>
                </div>
              </div>
            </div>
            <p style={{ marginTop: 20, fontSize: 12, color: 'var(--faint)' }}>Correlation only — other factors drive engagement too.</p>
          </Panel>

          <Panel title="When do posts perform best?">
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 12, letterSpacing: '.04em' }}>
                By day of week
              </div>
              <BarChart data={active.by_day} baseline={baseline?.by_day} />
              <GapNote text={gapLine(active.by_day, 'posts')} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 12, letterSpacing: '.04em' }}>
                By time of day
              </div>
              <BarChart data={active.by_hour_block} baseline={baseline?.by_hour_block} />
              <GapNote text={gapLine(active.by_hour_block, 'posts')} />
            </div>
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--faint)' }}>Times are UTC — day-of-week is more reliable than hour.</p>
          </Panel>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--faint)' }}>
        Patterns the leaders share — correlation across the category, not guarantees.
      </p>
    </div>
  );
}

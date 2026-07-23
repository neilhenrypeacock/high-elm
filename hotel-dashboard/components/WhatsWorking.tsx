'use client';

import { useState } from 'react';
import type { WhatsWorkingData, WwScope, WwLever, WwLeverBar, WwDeltaDir } from '@/lib/data';
import { WW_LEVERS_NOTE } from '@/lib/data';
import PageInfoButton from './PageInfoButton';

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";
const DISPLAY = "var(--font-display), 'Space Grotesk', sans-serif";

const SCOPES: { key: WwScope; label: string }[] = [
  { key: 'month', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
];

// Bar ramp: the leading bar takes the signal green and the rest step back
// towards a pale sage, so rank reads off the colour as well as the length.
const RAMP_TOP: [number, number, number] = [46, 115, 87];    // --signal #2E7357
const RAMP_END: [number, number, number] = [196, 217, 206];  // pale sage

/** Colour for bar `i` of `n`, interpolated along the ramp by rank. */
function rampColor(rank: number, n: number): string {
  if (n <= 1) return `rgb(${RAMP_TOP.join(',')})`;
  const t = rank / (n - 1);
  const c = RAMP_TOP.map((v, i) => Math.round(v + (RAMP_END[i] - v) * t));
  return `rgb(${c.join(',')})`;
}

/** How a bar's multiple reads. Anything that rounds to 1.0× is not a lead. */
function ratioLabel(ratio: number | null): { text: string; strong: boolean } {
  if (ratio == null) return { text: 'baseline', strong: false };
  if (ratio < 1.05) return { text: 'about the same', strong: false };
  return { text: `${ratio.toFixed(1)}× more engagement per post`, strong: true };
}

// Small counts read better spelled out — "The five levers", not "The 5 levers".
const COUNT_WORD: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' };

const TREND_MARK: Record<WwDeltaDir, string> = { up: '▲', down: '▼', flat: '—' };
const TREND_COLOR: Record<WwDeltaDir, string> = {
  up: 'var(--signal-deep)',
  down: 'var(--body-mid)',
  flat: 'var(--faint)',
};

function ScopeToggle({ value, onChange }: { value: WwScope; onChange: (s: WwScope) => void }) {
  return (
    <div
      role="group"
      aria-label="Analysis period"
      style={{
        display: 'inline-flex', alignItems: 'center', background: 'var(--surface-alt-2)',
        border: '1px solid var(--line)', borderRadius: 10, padding: 3, gap: 2, flexShrink: 0,
      }}
    >
      {SCOPES.map(s => {
        const active = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, border: 'none', borderRadius: 6,
              padding: '7px 15px', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              background: active ? 'var(--fill-strong)' : 'transparent',
              color: active ? 'var(--surface)' : 'var(--muted)',
              cursor: 'pointer', whiteSpace: 'nowrap',
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

/** The sample-size chip. A "strong signal" chip is green; an early one stays grey. */
function SamplePill({ lever }: { lever: WwLever }) {
  const strong = lever.strength === 'strong';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, flex: 'none', fontFamily: LABEL,
        fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: strong ? 'var(--signal-deep)' : 'var(--muted)',
        background: strong ? 'rgba(46,115,87,0.09)' : 'rgba(60,54,44,0.06)',
        borderRadius: 999, padding: '4px 9px',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: strong ? 'var(--signal)' : 'var(--faint)' }} />
      {lever.sample}
    </span>
  );
}

function LeverHead({ index, lever }: { index: string; lever: WwLever }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: 'var(--signal-deep)' }}>{index}</span>
      <span style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted)' }}>
        {lever.label}
      </span>
      <span style={{ marginLeft: 'auto' }}>
        <SamplePill lever={lever} />
      </span>
    </div>
  );
}

function LeverHeadline({ lever }: { lever: WwLever }) {
  return (
    <>
      <p style={{ fontSize: 18, lineHeight: 1.45, color: 'var(--ink)', fontWeight: 500, margin: 0, maxWidth: 780, textWrap: 'pretty' }}>
        {lever.headline.pre}
        <span style={{ color: 'var(--signal-deep)', fontWeight: 600 }}>{lever.headline.highlight}</span>
        {lever.headline.post}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        <span style={{ color: TREND_COLOR[lever.trend.dir], fontSize: 10 }}>{TREND_MARK[lever.trend.dir]}</span>
        {lever.trend.text}
      </div>
    </>
  );
}

function LeverBars({ bars, note, cta }: { bars: WwLeverBar[]; note: string; cta: WwLever['cta'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      {bars.map(b => {
        const r = ratioLabel(b.ratio);
        // Rank by width so the colour ramp tracks the bar length even when the
        // bars are held in a fixed order (days of the week).
        const rank = [...bars].sort((x, y) => y.width - x.width).findIndex(x => x.label === b.label);
        return (
          <div key={b.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: rank === 0 ? 600 : 400 }}>
                {b.label}
                {b.sub && <span style={{ color: 'var(--faint)', fontWeight: 400, fontSize: 11.5 }}> {b.sub}</span>}
              </span>
              <span style={{ fontSize: 11.5, textAlign: 'right' }}>
                <span style={{ color: r.strong ? 'var(--body-mid)' : 'var(--faint)', fontWeight: r.strong ? 600 : 400 }}>{r.text}</span>
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--track)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%', width: `${b.width}%`, background: rampColor(rank, bars.length),
                  borderRadius: 4, transition: 'width 400ms ease',
                }}
              />
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.5, margin: '2px 0 0' }}>{note}</p>
      {cta && <LeverCta cta={cta} />}
    </div>
  );
}

function LeverCta({ cta }: { cta: NonNullable<WwLever['cta']> }) {
  return (
    <a
      href={cta.href}
      className="cr-link"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontFamily: LABEL,
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--signal-deep)', textDecoration: 'none', alignSelf: 'flex-start',
      }}
    >
      {cta.label} <span aria-hidden="true">→</span>
    </a>
  );
}

function ThemeList({ title, themes }: { title: string; themes: NonNullable<WwLever['themes']> }) {
  return (
    <>
      <div
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: LABEL, fontSize: 10,
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em',
          color: 'var(--signal-deep)', margin: '20px 0 4px',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
        </svg>
        {title}
      </div>
      <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
        {themes.map(t => (
          <li key={t.title} style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '14px 0', borderTop: '1px solid var(--line-soft)' }}>
            <span aria-hidden="true" style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', marginTop: 8 }} />
            <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--body-strong)' }}>
              <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{t.title}.</span> {t.text}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-card)',
  padding: '28px 30px',
};

function LeverCard({ index, lever }: { index: string; lever: WwLever }) {
  // A lever with a theme list runs full width; a lever with bars splits into
  // prose on the left and the chart on the right.
  if (!lever.bars.length) {
    return (
      <section style={CARD}>
        <LeverHead index={index} lever={lever} />
        <LeverHeadline lever={lever} />
        {lever.themes && lever.themesTitle && <ThemeList title={lever.themesTitle} themes={lever.themes} />}
        {lever.cta && <LeverCta cta={lever.cta} />}
      </section>
    );
  }

  return (
    <section
      className="cr-lever"
      style={{ ...CARD, display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 38, alignItems: 'start' }}
    >
      <div>
        <LeverHead index={index} lever={lever} />
        <LeverHeadline lever={lever} />
      </div>
      <LeverBars bars={lever.bars} note={lever.barsNote} cta={lever.cta} />
    </section>
  );
}

export default function WhatsWorkingPanel({ data }: { data: WhatsWorkingData }) {
  const [scope, setScope] = useState<WwScope>('month');
  const d = data[scope];

  return (
    <div>
      {/* Header — title + lede on the left, period toggle on the right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginTop: 6 }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: 12 }}>
            Portfolio analysis
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)', lineHeight: 1.15 }}>
              What&rsquo;s working across the portfolio
            </h2>
            <PageInfoButton infoKey="working" />
          </div>
          <p style={{ fontSize: 14, color: 'var(--body-soft)', lineHeight: 1.7, marginTop: 12 }}>{d.lede}</p>
        </div>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>

      {/* Section rule — what the stack is, and the standing caveat */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', margin: '30px 0 18px' }}>
        <div style={{ fontFamily: LABEL, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)' }}>
          {d.levers.length === 1 ? 'The lever' : `The ${COUNT_WORD[d.levers.length] ?? d.levers.length} levers`}
        </div>
        <div style={{ fontSize: 12, color: 'var(--faint)' }}>{WW_LEVERS_NOTE[scope]}</div>
      </div>

      {d.levers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {d.levers.map((lever, i) => (
            <LeverCard key={lever.id} index={String(i + 1).padStart(2, '0')} lever={lever} />
          ))}
        </div>
      ) : (
        <div style={{ ...CARD, fontSize: 14, color: 'var(--body-soft)', lineHeight: 1.7 }}>
          Not enough posts in this period yet to call a pattern. The levers appear once
          there are enough tracked posts to compare against.
        </div>
      )}

      {/* Close — back to the posts the patterns came from */}
      <div style={{ marginTop: 26, paddingTop: 24, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <a href="/dashboard#overview" className="cr-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--body-strong)', textDecoration: 'none' }}>
          This week&rsquo;s breakouts are tracking the same patterns <span aria-hidden="true" style={{ color: 'var(--signal-deep)' }}>→</span>
        </a>
        <a
          href="/dashboard#breakouts"
          className="cr-link"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: LABEL, fontSize: 12,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--signal-deep)', textDecoration: 'none',
          }}
        >
          See the posts behind these patterns <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}

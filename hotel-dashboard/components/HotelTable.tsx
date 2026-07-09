'use client';

import { useState, useMemo } from 'react';
import type { HotelRow } from '@/lib/data';
import { fmtFollowers, fmtDate, fmtNumber } from '@/lib/format';

type SortKey = 'name' | 'followers_count' | 'engagement_rate' | 'posts_per_week' | 'last_posted';
type SortDir = 'asc' | 'desc';

const LABEL = "var(--font-label), 'Space Mono', monospace";
const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '42px 2.4fr 1.1fr 0.8fr 1.4fr 0.8fr 1fr',
  gap: 24,
  padding: '16px 24px',
  alignItems: 'center',
};
const DEFAULT_VISIBLE = 10;

// Discreet text pins for a hotel's accolades (Forbes / Gold List / Michelin Keys).
// Text only — no official logos (trademark/endorsement risk). A hotel may carry more
// than one; empty for hotels not on any source list.
function AccreditationPins({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
      {labels.map(label => (
        <span
          key={label}
          title={`Listed: ${label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: 9.5,
            fontWeight: 500,
            letterSpacing: '0.01em',
            color: 'var(--body-soft)',
            background: 'var(--surface-alt-2)',
            border: '1px solid var(--line)',
            borderRadius: 5,
            padding: '2px 7px',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

const COLUMNS: { key: SortKey | null; label: string; align?: 'right'; className?: string }[] = [
  { key: null, label: '#' },
  { key: 'name', label: 'Hotel' },
  { key: null, label: 'Region', className: 'cr-lb-region' },
  { key: 'followers_count', label: 'Followers', align: 'right' },
  { key: 'engagement_rate', label: 'Eng. rate' },
  { key: 'posts_per_week', label: 'Posts/wk', align: 'right', className: 'cr-lb-ppw' },
  { key: 'last_posted', label: 'Last posted', align: 'right', className: 'cr-lb-last' },
];

export default function HotelTable({ hotels, regions }: { hotels: HotelRow[]; regions: string[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('engagement_rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Names read naturally A→Z; numeric columns start with the biggest
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const filtered = useMemo(() => {
    let rows = hotels;
    if (regionFilter !== 'All') rows = rows.filter(h => h.region === regionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        h => h.name.toLowerCase().includes(q) || h.instagram_handle.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      // localeCompare so accented hotel names ("Château…") sort naturally
      const cmp =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv, 'en', { sensitivity: 'base' })
          : av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [hotels, sortKey, sortDir, regionFilter, search]);

  const maxEr = useMemo(
    () => Math.max(...hotels.map(h => h.engagement_rate ?? 0), 0.001),
    [hotels]
  );

  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  // Top-3 emphasis only means something when ranked by ER descending (the default)
  const highlightTop3 = sortKey === 'engagement_rate' && sortDir === 'desc';

  return (
    <div style={{ marginTop: 32 }}>
      {/* Filter row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <input
          type="text"
          placeholder="Search hotel or handle…"
          aria-label="Search hotel or handle"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 280,
            fontSize: 13,
            fontFamily: 'inherit',
            color: 'var(--ink)',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '10px 14px',
            outline: 'none',
          }}
        />
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          aria-label="Filter by region"
          style={{
            fontSize: 13,
            fontFamily: 'inherit',
            color: 'var(--ink)',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '10px 14px',
            outline: 'none',
          }}
        >
          <option value="All">All regions</option>
          {regions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--faint)' }}>
          {filtered.length} hotels
        </span>
      </div>

      {/* Table card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div role="table" aria-label="Hotel leaderboard">
        {/* Header */}
        <div role="rowgroup">
        <div role="row" className="cr-lb-row" style={{ ...GRID, background: 'var(--ink)' }}>
          {COLUMNS.map(col => {
            const active = col.key !== null && sortKey === col.key;
            const headerStyle: React.CSSProperties = {
              fontFamily: LABEL,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: active ? '#F7F6F2' : '#A49D92',
              textAlign: col.align ?? 'left',
            };
            return (
              <div
                key={col.label}
                role="columnheader"
                aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className={col.className}
                style={headerStyle}
              >
                {col.key ? (
                  /* No `all: unset` here — it would wipe the :focus-visible outline */
                  <button
                    onClick={() => handleSort(col.key!)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'inherit',
                      letterSpacing: 'inherit',
                      textTransform: 'inherit',
                    }}
                  >
                    {col.label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </button>
                ) : (
                  col.label
                )}
              </div>
            );
          })}
        </div>
        </div>

        {/* Body */}
        <div role="rowgroup">
        {visible.map((h, i) => {
          const top3 = highlightTop3 && i < 3 && !search.trim() && regionFilter === 'All';
          const bg = top3 ? 'var(--top3-tint)' : i % 2 === 1 ? 'var(--surface-alt)' : 'var(--surface)';
          const hot = h.engagement_rate !== null && h.engagement_rate >= 1;
          const barW = h.engagement_rate !== null
            ? Math.max(6, Math.round((h.engagement_rate / maxEr) * 100))
            : 0;

          return (
            <div
              key={h.instagram_handle}
              role="row"
              className="cr-lb-row cr-lb-body-row"
              style={{ ...GRID, background: bg, borderTop: '1px solid var(--line-soft)' }}
            >
              <div
                role="cell"
                style={{
                  fontSize: 12,
                  fontWeight: top3 ? 700 : 400,
                  color: top3 ? 'var(--signal-deep)' : 'var(--faint)',
                }}
              >
                {i + 1}
              </div>

              <div role="cell" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>@{h.instagram_handle}</div>
                <AccreditationPins labels={h.accreditations} />
              </div>

              <div role="cell" className="cr-lb-region" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {h.region ?? '—'}
              </div>

              <div role="cell" style={{ fontSize: 12, color: 'var(--ink)', textAlign: 'right' }}>
                {fmtFollowers(h.followers_count).toLowerCase()}
              </div>

              <div role="cell">
                {h.engagement_rate !== null ? (
                  // Valid ER — a soft flag (low-confidence breakout baseline) shows
                  // a warning next to it but keeps the value counted
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: hot ? 'var(--signal-deep)' : 'var(--ink)' }}>
                        {fmtNumber(h.engagement_rate, 2)}%
                      </span>
                      {h.er_flag_reason && (
                        <span
                          tabIndex={0}
                          title={h.er_flag_reason}
                          aria-label={h.er_flag_reason}
                          style={{ color: 'var(--signal-deep)', cursor: 'help', fontSize: 12 }}
                        >
                          ⚠
                        </span>
                      )}
                    </span>
                    <div style={{ height: 4, marginTop: 5, marginRight: 24, background: 'var(--track)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${barW}%`,
                          borderRadius: 2,
                          background: hot ? 'var(--signal)' : 'var(--bar-grey)',
                        }}
                      />
                    </div>
                  </>
                ) : h.er_flag_reason ? (
                  // Hard flag — the ER itself is unreliable and excluded
                  <span
                    tabIndex={0}
                    title={h.er_flag_reason}
                    aria-label={h.er_flag_reason}
                    style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span style={{ color: 'var(--signal-deep)' }}>⚠</span>
                    <span style={{ fontFamily: LABEL, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--faint)' }}>
                      flagged
                    </span>
                  </span>
                ) : (
                  <span style={{ color: 'var(--faint)' }}>—</span>
                )}
              </div>

              <div role="cell" className="cr-lb-ppw" style={{ fontSize: 12, color: 'var(--ink)', textAlign: 'right' }}>
                {h.posts_per_week !== null ? fmtNumber(h.posts_per_week, 1) : '—'}
              </div>

              <div role="cell" className="cr-lb-last" style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'right' }}>
                {fmtDate(h.last_posted)}
              </div>
            </div>
          );
        })}
        </div>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center', fontSize: 14, color: 'var(--body-mid)', borderTop: '1px solid var(--line-soft)' }}>
            No hotels match your filters.
          </div>
        )}

        {/* Footer row */}
        {filtered.length > DEFAULT_VISIBLE && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--line-soft)',
              fontSize: 12,
              color: 'var(--body-mid)',
            }}
          >
            {showAll ? (
              <>
                Showing all {filtered.length} hotels ·{' '}
                <button
                  onClick={() => setShowAll(false)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--signal-deep)', fontWeight: 500 }}
                >
                  view less ↑
                </button>
              </>
            ) : (
              <>
                Showing top {DEFAULT_VISIBLE} of {filtered.length} ·{' '}
                <button
                  onClick={() => setShowAll(true)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--signal-deep)', fontWeight: 500 }}
                >
                  view more ↓
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--faint)', lineHeight: 1.6 }}>
        Engagement rate = mean(likes + comments) on the last 30 posts ÷ followers × 100. Hotels with
        under 3 visible-likes posts or rates above 10% are flagged{' '}
        <span style={{ color: 'var(--signal-deep)' }}>⚠</span> and excluded from category medians;
        a <span style={{ color: 'var(--signal-deep)' }}>⚠</span> beside a value only marks a
        low-confidence breakout baseline. Public Instagram data only — no reach or impressions.
        Pins mark hotels named on the Forbes Travel Guide five-star list, the Condé Nast Traveller
        Gold List, or Michelin Keys (UK &amp; Ireland) — coverage of those lists is partial.
      </p>
    </div>
  );
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import { DORMANT_DAYS, type HotelRow } from '@/lib/data';
import { fmtFollowers, fmtDate, fmtNumber } from '@/lib/format';
import SaveToggle from './SaveToggle';

// Watchlist control for a hotel — the same SaveToggle as the post cards, but
// LABELLED here. On a leaderboard row a bare bookmark reads as "save this
// thing" without saying what it saves or where it goes, so the word
// "Watchlist" is carried on the control itself.
function HotelWatchToggle({ handle, name, saved }: { handle: string; name: string; saved: boolean }) {
  return (
    <SaveToggle
      initialSaved={saved}
      endpoint="/api/watchlist"
      saveBody={{ instagram_handle: handle, hotel_name: name }}
      deleteBody={{ instagram_handle: handle }}
      label={`Add ${name} to your hotel watchlist`}
      savedLabel={`On your hotel watchlist — remove ${name}`}
      variant="inline"
      text="Watchlist"
    />
  );
}

// 'momentum' is a rank-only option (no column of its own): total engagement
// over the last 30 days ÷ followers — rewards posting often as well as posting well.
type SortKey = 'name' | 'followers_count' | 'engagement_rate' | 'posts_per_week' | 'last_posted' | 'momentum';
type SortDir = 'asc' | 'desc';

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";
const GRID: React.CSSProperties = {
  display: 'grid',
  // Hotel column carries the name, handle, accreditation pins AND the labelled
  // Watchlist control, so it takes the extra width the region column can spare.
  gridTemplateColumns: '42px 3fr 0.9fr 0.8fr 1.4fr 0.8fr 1fr',
  gap: 24,
  padding: '16px 24px',
  alignItems: 'center',
};
const DEFAULT_VISIBLE = 10;
// Snapshotted at load — render must stay pure (react-hooks/purity), and
// page-load precision is plenty for a "posted in the last 60 days?" check.
const LOADED_AT_MS = Date.now();

// Discreet text pins for a hotel's accolades (Forbes / Gold List / Michelin Keys).
// Text only — no official logos (trademark/endorsement risk). A hotel may carry more
// than one; empty for hotels not on any source list.
// Exported for reuse by the Your Hotel page (components/YourHotel.tsx).
export function AccreditationPins({ labels }: { labels: string[] }) {
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

export default function HotelTable({
  hotels,
  regions,
  watchlistHandles = [],
}: {
  hotels: HotelRow[];
  regions: string[];
  watchlistHandles?: string[];
}) {
  const watchSet = useMemo(() => new Set(watchlistHandles), [watchlistHandles]);
  const [sortKey, setSortKey] = useState<SortKey>('engagement_rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Sort value per key — 'momentum' isn't a HotelRow field, so it's mapped here.
  const sortValue = useCallback(
    (h: HotelRow, key: SortKey) => (key === 'momentum' ? h.recent_rate.d30 : h[key]),
    []
  );

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
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
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
  }, [hotels, sortKey, sortDir, regionFilter, search, sortValue]);

  // Bar scale + a relative "strong performer" threshold (≥ the portfolio
  // median of per-hotel median ERs) — relative, so it holds as the field shifts.
  const maxRate = useMemo(
    () => Math.max(...hotels.map(h => h.engagement_rate ?? 0), 0.001),
    [hotels]
  );
  const medianRate = useMemo(() => {
    const vals = hotels.map(h => h.engagement_rate).filter((v): v is number => v !== null).sort((a, b) => a - b);
    if (!vals.length) return 0;
    const m = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[m] : (vals[m - 1] + vals[m]) / 2;
  }, [hotels]);

  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  // Top-3 emphasis only means something under a performance ranking, descending
  const highlightTop3 = (sortKey === 'engagement_rate' || sortKey === 'momentum') && sortDir === 'desc';

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

        {/* Rank by — Eng. rate (the typical post) or Momentum (30-day output).
            Neither pill lights when the user sorts by another column header. */}
        <div
          role="group"
          aria-label="Rank by"
          style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--surface-alt-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 3, gap: 2 }}
        >
          {([
            { key: 'engagement_rate', label: 'Eng. rate', title: 'Rank by the typical post — median engagement per post ÷ followers' },
            { key: 'momentum', label: 'Momentum', title: 'Rank by 30-day output — all engagement in the last 30 days ÷ followers, so posting often counts too' },
          ] as const).map(opt => {
            const active = sortKey === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setSortKey(opt.key); setSortDir('desc'); }}
                aria-pressed={active}
                title={opt.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 13px',
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
                {opt.label}
              </button>
            );
          })}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--faint)' }}>
          {filtered.length} hotels
        </span>
      </div>

      {/* One plain-English line for whichever ranking is showing. The tooltips on
          the pills above are invisible on touch and jargon-y besides, so the
          explanation is stated on the page. Sorting by another column header
          leaves this on the eng. rate line — that column is always displayed. */}
      <p
        aria-live="polite"
        style={{ margin: '-4px 0 18px', fontSize: 12.5, color: 'var(--body-mid)', lineHeight: 1.6 }}
      >
        {sortKey === 'momentum' ? (
          <>
            <strong style={{ fontWeight: 600, color: 'var(--signal-deep)' }}>Momentum</strong>
            {' — how much attention a hotel pulled in over the last 30 days, for its size. Posting more often lifts it, so it rewards hotels that show up regularly.'}
          </>
        ) : (
          <>
            <strong style={{ fontWeight: 600, color: 'var(--signal-deep)' }}>Eng. rate</strong>
            {' — how well a hotel’s '}
            <em>typical</em>
            {' post does, for its size. A small hotel whose posts land can rank above a much bigger one, and a single viral hit won’t carry it.'}
          </>
        )}
      </p>

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
        <div role="row" className="cr-lb-row" style={{ ...GRID, background: 'var(--fill-strong)' }}>
          {COLUMNS.map(col => {
            const active = col.key !== null && sortKey === col.key;
            const headerLabel = col.label;
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
                    {headerLabel} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </button>
                ) : (
                  headerLabel
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
          const rate = h.engagement_rate;
          const strong = rate !== null && rate >= medianRate;
          const barW = rate !== null ? Math.max(6, Math.round((rate / maxRate) * 100)) : 0;
          // Mirror of the data layer's dormancy gate, so the "—" says why
          const dormant =
            h.last_posted === null ||
            LOADED_AT_MS - new Date(h.last_posted).getTime() > DORMANT_DAYS * 24 * 60 * 60 * 1000;

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

              <div role="cell" className="cr-lb-hotel-cell" style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="cr-lb-hotel-main" style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{h.instagram_handle}</div>
                  <AccreditationPins labels={h.accreditations} />
                </div>
                <HotelWatchToggle handle={h.instagram_handle} name={h.name} saved={watchSet.has(h.instagram_handle)} />
              </div>

              <div role="cell" className="cr-lb-region" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {h.region ?? '—'}
              </div>

              <div role="cell" style={{ fontSize: 12, color: 'var(--ink)', textAlign: 'right' }}>
                {fmtFollowers(h.followers_count).toLowerCase()}
              </div>

              <div role="cell">
                {rate !== null ? (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 700, color: strong ? 'var(--signal-deep)' : 'var(--ink)' }}>
                      {fmtNumber(rate, 2)}%
                    </span>
                    <div style={{ height: 4, marginTop: 5, marginRight: 24, background: 'var(--track)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${barW}%`,
                          borderRadius: 2,
                          background: strong ? 'var(--signal)' : 'var(--bar-grey)',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  // Dormant, too few readable posts, or likes hidden — nothing to rate
                  <span
                    style={{ color: 'var(--faint)' }}
                    title={dormant ? `Nothing posted in the last ${DORMANT_DAYS} days` : 'Not enough readable posts to rate'}
                  >
                    —
                  </span>
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
        Eng. rate = the hotel&rsquo;s median (likes + comments) per post ÷ followers × 100, over its
        last 30 posts — what a typical post does, so one viral hit doesn&rsquo;t inflate it. Prefer
        to reward posting often too? Rank by Momentum: all engagement over the last 30 days ÷
        followers × 100. Hotels with too few readable posts — or nothing posted in the last{' '}
        {DORMANT_DAYS} days — show <span aria-hidden="true">—</span>.
        Public Instagram data only — no reach or impressions. Pins mark hotels named on the Forbes
        Travel Guide five-star list, the Condé Nast Traveller Gold List, The World&rsquo;s 50 Best
        Hotels, or Michelin Keys (UK &amp; Ireland) — coverage of those lists is partial.
      </p>
    </div>
  );
}

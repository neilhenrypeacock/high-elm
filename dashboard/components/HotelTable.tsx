'use client';

import { useState, useMemo } from 'react';
import type { HotelRow } from '@/lib/data';

type SortKey = 'name' | 'followers_count' | 'engagement_rate' | 'posts_per_week' | 'last_posted';
type SortDir = 'asc' | 'desc';

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return '—';
  return n.toLocaleString('en-GB', { maximumFractionDigits: decimals });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtFollowers(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return n.toString();
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-block text-xs" style={{ color: active ? 'var(--signal)' : 'var(--line)' }}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

const DEFAULT_VISIBLE = 30;

export default function HotelTable({ hotels, regions }: { hotels: HotelRow[]; regions: string[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('engagement_rate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    let rows = hotels;
    if (regionFilter !== 'All') rows = rows.filter(h => h.region === regionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.instagram_handle.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [hotels, sortKey, sortDir, regionFilter, search]);

  const th = 'text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none px-4 py-3 whitespace-nowrap';
  const td = 'px-4 py-3 text-sm';

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search hotel or handle…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none w-64"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8 }}
        />
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          <option value="All">All countries</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="ml-auto text-sm self-center" style={{ color: 'var(--muted)' }}>
          {filtered.length} hotels
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'var(--card-soft)' }}>
              <tr>
                <th className={th} style={{ color: 'var(--muted)' }} onClick={() => handleSort('name')}>
                  Hotel <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </th>
                <th className={th} style={{ color: 'var(--muted)' }}>Country</th>
                <th className={th} style={{ color: 'var(--muted)' }} onClick={() => handleSort('followers_count')}>
                  Followers <SortIcon active={sortKey === 'followers_count'} dir={sortDir} />
                </th>
                <th className={th} style={{ color: 'var(--muted)' }} onClick={() => handleSort('engagement_rate')}>
                  Eng. rate <SortIcon active={sortKey === 'engagement_rate'} dir={sortDir} />
                </th>
                <th className={th} style={{ color: 'var(--muted)' }} onClick={() => handleSort('posts_per_week')}>
                  Posts/wk <SortIcon active={sortKey === 'posts_per_week'} dir={sortDir} />
                </th>
                <th className={th} style={{ color: 'var(--muted)' }} onClick={() => handleSort('last_posted')}>
                  Last posted <SortIcon active={sortKey === 'last_posted'} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE)).map((h, i) => (
                <tr
                  key={h.instagram_handle}
                  style={{
                    background: i % 2 === 0 ? 'var(--card)' : 'var(--card-soft)',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <td className={td}>
                    <div className="font-medium" style={{ color: 'var(--ink)' }}>{h.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>@{h.instagram_handle}</div>
                  </td>
                  <td className={td} style={{ color: 'var(--muted)' }}>{h.region ?? '—'}</td>
                  <td className={td} style={{ color: 'var(--ink)' }}>{fmtFollowers(h.followers_count)}</td>
                  <td className={td}>
                    {h.er_flag_reason ? (
                      <span title={h.er_flag_reason} className="cursor-help">
                        <span style={{ color: 'var(--signal-deep)' }}>⚠</span>
                        <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>
                          {h.er_flag_reason}
                        </span>
                      </span>
                    ) : h.engagement_rate !== null ? (
                      <span style={{ color: h.engagement_rate >= 1 ? 'var(--signal-deep)' : 'var(--ink)' }}>
                        {fmt(h.engagement_rate, 2)}%
                      </span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td className={td} style={{ color: 'var(--ink)' }}>{h.posts_per_week !== null ? fmt(h.posts_per_week, 1) : '—'}</td>
                  <td className={td} style={{ color: 'var(--muted)' }}>{fmtDate(h.last_posted)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No hotels match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > DEFAULT_VISIBLE && (
        <div className="mt-3 text-center">
          {showAll ? (
            <button
              onClick={() => setShowAll(false)}
              className="text-sm px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--line)' }}
            >
              Show fewer
            </button>
          ) : (
            <button
              onClick={() => setShowAll(true)}
              className="text-sm px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--card)', color: 'var(--signal-deep)', border: '1px solid var(--line)' }}
            >
              Show all {filtered.length} hotels
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
        Engagement rate = avg(likes + comments) on last 12 posts ÷ followers × 100. Requires ≥{3} posts with visible
        likes; ER above 10% is flagged <span style={{ color: 'var(--signal-deep)' }}>⚠</span> and excluded from category averages.
        Data reflects public Instagram information only — no reach or impressions.
      </p>
    </div>
  );
}

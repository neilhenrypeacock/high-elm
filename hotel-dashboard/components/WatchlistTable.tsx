'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { HotelRow } from '@/lib/data';
import { fmtFollowers, fmtNumber, fmtDate } from '@/lib/format';
import SaveToggle from './SaveToggle';

// The Watchlist page's hotel list. Rows are re-joined to live leaderboard data by
// the page; the watch toggle is seeded on, and un-watching removes the row here.
export default function WatchlistTable({ initialHotels }: { initialHotels: HotelRow[] }) {
  const [hotels, setHotels] = useState(initialHotels);

  if (hotels.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-card)',
          padding: '48px 40px',
          textAlign: 'center',
          color: 'var(--body-mid)',
          fontSize: 14,
        }}
      >
        You’ve cleared your watchlist.{' '}
        <Link href="/dashboard#leaderboard" className="cr-link" style={{ color: 'var(--signal-deep)', fontWeight: 500 }}>
          Open the leaderboard ↗
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {hotels.map((h, i) => {
        const hot = h.engagement_rate !== null && h.engagement_rate >= 1;
        return (
          <div
            key={h.instagram_handle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 2 }}>@{h.instagram_handle}</div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: hot ? 'var(--signal-deep)' : 'var(--ink)' }}>
                {h.engagement_rate !== null ? `${fmtNumber(h.engagement_rate, 2)}%` : '—'}
              </div>
              <div style={{ fontFamily: "var(--font-label), monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--faint)', marginTop: 2 }}>
                eng. rate
              </div>
            </div>

            <div className="cr-wl-meta" style={{ textAlign: 'right', flexShrink: 0, minWidth: 92 }}>
              <div style={{ fontSize: 12, color: 'var(--ink)' }}>{fmtFollowers(h.followers_count).toLowerCase()}</div>
              <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{fmtDate(h.last_posted)}</div>
            </div>

            <SaveToggle
              initialSaved
              endpoint="/api/watchlist"
              saveBody={{ instagram_handle: h.instagram_handle, hotel_name: h.name }}
              deleteBody={{ instagram_handle: h.instagram_handle }}
              label={`Add ${h.name} to watchlist`}
              savedLabel={`On your watchlist — remove ${h.name}`}
              variant="inline"
              onChange={s => {
                if (!s) setHotels(hs => hs.filter(x => x.instagram_handle !== h.instagram_handle));
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

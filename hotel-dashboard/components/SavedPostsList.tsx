'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { OutlierPost } from '@/lib/data';
import { BreakoutCard } from './ContentRadar';

// The Saved page's post list. Reuses the dashboard's BreakoutCard (no rank badge
// here) with the Save control seeded on; un-saving removes the card in place.
export default function SavedPostsList({ initialPosts }: { initialPosts: OutlierPost[] }) {
  const [posts, setPosts] = useState(initialPosts);

  if (posts.length === 0) {
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
        You’ve cleared your saved posts.{' '}
        <Link href="/dashboard" className="cr-link" style={{ color: 'var(--signal-deep)', fontWeight: 500 }}>
          Browse breakouts ↗
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {posts.map(p => (
        <BreakoutCard
          key={`${p.post_id}-${p.instagram_handle}`}
          post={p}
          saved
          onSavedChange={s => {
            if (!s) {
              setPosts(ps =>
                ps.filter(x => !(x.post_id === p.post_id && x.instagram_handle === p.instagram_handle)),
              );
            }
          }}
        />
      ))}
    </div>
  );
}

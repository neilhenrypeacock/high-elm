'use client';

import type { OutlierPost } from '@/lib/data';
import { postKey } from '@/lib/post-key';
import { BreakoutCard } from './ContentRadar';

// The Featured shelf — the hand-picked inspiration list. Every post here
// carries standout_posts.editors_pick (ticked in /admin), so the list is
// curated editorially rather than windowed: it grows as new standouts earn a
// place. Reuses the dashboard's BreakoutCard (which already renders the
// Editor's note + Editor's Pick badge); no rank badge — this isn't a ranking.

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";

export default function FeaturedPosts({
  posts,
  savedPostKeys = [],
}: {
  posts: OutlierPost[];
  savedPostKeys?: string[];
}) {
  const savedSet = new Set(savedPostKeys);

  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--muted)',
            marginBottom: 10,
          }}
        >
          Featured · hand-picked
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: '0 0 10px',
          }}
        >
          Standout inspiration
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--body-mid)', maxWidth: 620, margin: 0 }}>
          The posts we&rsquo;ve picked out as genuinely worth studying — hand-picked from the
          breakouts, most with a note on why each one worked. This shelf isn&rsquo;t windowed
          like Top posts; it grows as new standouts earn a place.
        </p>
      </header>

      {posts.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-card)',
            padding: '56px 40px',
            textAlign: 'center',
            color: 'var(--body-mid)',
            fontSize: 14,
          }}
        >
          Nothing featured just yet — the first picks land after this week&rsquo;s editorial pass.{' '}
          <a href="#breakouts" className="cr-link" style={{ color: 'var(--signal-deep)', fontWeight: 500 }}>
            Browse the breakouts →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {posts.map(p => (
            <BreakoutCard
              key={postKey(p.post_id, p.instagram_handle)}
              post={p}
              saved={savedSet.has(postKey(p.post_id, p.instagram_handle))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

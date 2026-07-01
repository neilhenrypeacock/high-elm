'use client';

import { useState } from 'react';
import type { OutlierPost } from '@/lib/data';

const DRIVER_COLORS: Record<string, string> = {
  Collaboration: 'var(--accent)',
  Seasonal:      '#d97706',
  Event:         '#16a34a',
  Property:      '#7c3aed',
  People:        '#db2777',
};

function ImageWithFallback({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: 'var(--surface-2)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No image</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setFailed(true)} />
  );
}

function postPermalink(p: OutlierPost): string {
  return p.post_url ?? `https://www.instagram.com/p/${p.post_id}/`;
}

function DriverTag({ tag }: { tag: string | null }) {
  if (!tag) return null;
  const color = DRIVER_COLORS[tag] ?? 'var(--text-muted)';
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {tag}
    </span>
  );
}

export default function StandoutPosts({ posts }: { posts: OutlierPost[] }) {
  if (!posts.length) {
    return (
      <div
        className="rounded-xl p-6 text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        No standout posts found in the last 7 days. This section fills in as more data is collected.
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
      {posts.map(p => (
        <a
          key={p.post_id}
          href={postPermalink(p)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            textDecoration: 'none',
          }}
        >
          {/* Image — stored copy preferred; placeholder on error */}
          <div className="w-full overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
            <ImageWithFallback src={p.image_url} alt={p.hotel_name} />
          </div>

          {/* Info */}
          <div className="p-3 flex flex-col gap-1.5 flex-1">
            <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--text)' }}>
              {p.hotel_name}
            </div>
            {p.hotel_country && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {p.hotel_country}
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                {p.type ?? 'Post'}
              </span>
            </div>

            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>♥ {p.likes_count.toLocaleString()}</span>
              <span>💬 {p.comments_count.toLocaleString()}</span>
            </div>

            <div className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
              {p.multiplier.toFixed(1)}× their median
            </div>

            {p.post_insight && (
              <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                {p.post_insight}
              </p>
            )}

            {p.driver_tag && <DriverTag tag={p.driver_tag} />}

            <div className="mt-auto pt-1 text-xs" style={{ color: 'var(--accent)', opacity: 0.7 }}>
              View on Instagram ↗
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { OutlierPost } from '@/lib/data';
import { fmtFollowers, fmtPostedAt } from '@/lib/format';

const LABEL = "var(--font-label), 'Space Mono', monospace";
const DISPLAY = "var(--font-display), 'Baloo 2', sans-serif";
const MEDIA_PLACEHOLDER = 'linear-gradient(135deg, #2b2824, #3c372e)';
const THUMB_PLACEHOLDER = 'linear-gradient(135deg, #2f2b26, #3d382f)';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: LABEL,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: 'var(--muted)',
      }}
    >
      {children}
    </div>
  );
}

function ImageWithFallback({ src, alt, fallback }: { src: string | null; alt: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div style={{ position: 'absolute', inset: 0, background: fallback }} />;
  }
  return (
    // Instagram CDN images are external and short-lived — plain <img> with a fallback
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      onError={() => setFailed(true)}
    />
  );
}

function permalink(p: OutlierPost): string {
  return p.post_url ?? `https://www.instagram.com/p/${p.post_id}/`;
}

function TagChip({ type }: { type: string | null }) {
  if (!type || type === 'Other') return null;
  return (
    <span
      style={{
        fontFamily: LABEL,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#F7F6F2',
        background: 'rgba(20,18,15,0.55)',
        borderRadius: 6,
        padding: '4px 9px',
      }}
    >
      {type}
    </span>
  );
}

// ─── Top-5 breakout card ──────────────────────────────────────────────────────
function BreakoutCard({ post: p, rank }: { post: OutlierPost; rank: number }) {
  const followersStr = fmtFollowers(p.hotel_followers);
  const meta = [p.hotel_country, followersStr !== '—' ? `${followersStr} followers` : null, fmtPostedAt(p.posted_at)]
    .filter(Boolean)
    .join(' · ');

  const statCells = [
    { label: 'Likes', value: p.likes_count, mult: p.likes_multiple, typical: p.hotel_typical_likes },
    { label: 'Comments', value: p.comments_count, mult: p.comments_multiple, typical: p.hotel_typical_comments },
  ];

  return (
    <div
      className="cr-lift"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="cr-card-grid"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.9fr) 1.1fr' }}
      >
        {/* Media */}
        <a
          href={permalink(p)}
          target="_blank"
          rel="noopener noreferrer"
          className="cr-card-media"
          style={{ position: 'relative', minHeight: 400, display: 'block', background: MEDIA_PLACEHOLDER }}
          aria-label={`View ${p.hotel_name}'s post on Instagram`}
        >
          <ImageWithFallback src={p.image_url} alt={p.hotel_name} fallback={MEDIA_PLACEHOLDER} />
          <span style={{ position: 'absolute', top: 14, left: 14 }}>
            <TagChip type={p.type} />
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              fontFamily: LABEL,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'rgba(247,246,242,0.4)',
            }}
          >
            Rank {String(rank).padStart(2, '0')}
          </span>
        </a>

        {/* Content */}
        <div className="cr-card-body" style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {/* Multiplier */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <span
              style={{
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 60,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'var(--signal-deep)',
              }}
            >
              {p.multiplier.toFixed(1)}×
            </span>
            <span
              style={{
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--muted)',
                lineHeight: 1.5,
                paddingBottom: 6,
              }}
            >
              vs hotel<br />median
            </span>
          </div>

          {/* Hotel */}
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.25 }}>
              {p.hotel_name}
            </div>
            {meta && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{meta}</div>}
          </div>

          {/* Insight */}
          {p.post_insight && (
            <p style={{ fontSize: 13, color: 'var(--body-strong)', lineHeight: 1.6, margin: '4px 0 0' }}>
              {p.post_insight}
            </p>
          )}

          {/* Likes / Comments pair */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              background: 'var(--line)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              overflow: 'hidden',
              marginTop: 4,
            }}
          >
            {statCells.map(cell => (
              <div key={cell.label} style={{ background: 'var(--surface-alt)', padding: '16px 18px' }}>
                <div
                  style={{
                    fontFamily: LABEL,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--faint)',
                    marginBottom: 7,
                  }}
                >
                  {cell.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                    {cell.value.toLocaleString('en-GB')}
                  </span>
                  {cell.mult > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--signal-deep)' }}>
                      ↑{cell.mult.toFixed(1)}×
                    </span>
                  )}
                </div>
                {cell.typical !== null && (
                  <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 5 }}>
                    vs median {Math.round(cell.typical).toLocaleString('en-GB')}
                  </div>
                )}
              </div>
            ))}
          </div>

          <a
            href={permalink(p)}
            target="_blank"
            rel="noopener noreferrer"
            className="cr-link"
            style={{ marginTop: 'auto', fontSize: 12, fontWeight: 500, color: 'var(--signal-deep)', textDecoration: 'none' }}
          >
            View on Instagram ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Ranks 6+ compact table row ───────────────────────────────────────────────
function PostRow({ post: p, rank }: { post: OutlierPost; rank: number }) {
  const followersStr = fmtFollowers(p.hotel_followers);
  const sub = [p.hotel_country, followersStr !== '—' ? `${followersStr} followers` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <a
      href={permalink(p)}
      target="_blank"
      rel="noopener noreferrer"
      className="cr-post-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '16px 24px',
        borderBottom: '1px solid var(--line-soft)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 18,
          color: 'var(--faint)',
          width: 26,
          flexShrink: 0,
        }}
      >
        {String(rank).padStart(2, '0')}
      </span>

      <span style={{ position: 'relative', width: 64, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: THUMB_PLACEHOLDER }}>
        <ImageWithFallback src={p.image_url} alt={p.hotel_name} fallback={THUMB_PLACEHOLDER} />
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.hotel_name}
        </span>
        {sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</span>}
      </span>

      <span className="cr-row-engage" style={{ fontSize: 12, color: 'var(--body-mid)', width: 170, textAlign: 'right', flexShrink: 0 }}>
        {p.likes_multiple > 0 ? `↑${p.likes_multiple.toFixed(1)}× likes` : '— likes'} ·{' '}
        {p.comments_multiple > 0 ? `↑${p.comments_multiple.toFixed(1)}× comments` : '— comments'}
      </span>

      <span style={{ width: 64, textAlign: 'right', flexShrink: 0 }}>
        <span style={{ display: 'block', fontSize: 18, fontWeight: 700, color: 'var(--signal-deep)' }}>
          {p.multiplier.toFixed(1)}×
        </span>
        <span style={{ display: 'block', fontFamily: LABEL, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--faint)' }}>
          vs median
        </span>
      </span>

      <span className="cr-row-date" style={{ fontSize: 12, color: 'var(--faint)', width: 120, textAlign: 'right', flexShrink: 0 }}>
        {fmtPostedAt(p.posted_at)}
      </span>
    </a>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ContentRadar({ posts }: { posts: OutlierPost[] }) {
  const [showMore, setShowMore] = useState(false);

  const topPosts = posts.slice(0, 5);
  const rest = posts.slice(5);
  const visibleRest = showMore ? rest : rest.slice(0, 10);
  const hiddenCount = rest.length - 10;

  if (posts.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 14,
          border: '1px solid var(--line)',
          padding: '56px 40px',
          textAlign: 'center',
          color: 'var(--body-mid)',
          fontSize: 14,
        }}
      >
        No posts broke meaningfully past their hotel&rsquo;s own median this week.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Top 5 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Eyebrow>Top 5</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {topPosts.map((p, i) => (
            <BreakoutCard key={`${p.post_id}-${p.instagram_handle}`} post={p} rank={i + 1} />
          ))}
        </div>
      </div>

      {/* Ranks 6+ */}
      {rest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Eyebrow>Top 6 – {5 + rest.length}</Eyebrow>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {visibleRest.map((p, i) => (
              <PostRow key={`${p.post_id}-${p.instagram_handle}`} post={p} rank={i + 6} />
            ))}
          </div>
          {hiddenCount > 0 && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button
                onClick={() => setShowMore(v => !v)}
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
                {showMore ? 'Show less ↑' : `Show ${hiddenCount} more ↓`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

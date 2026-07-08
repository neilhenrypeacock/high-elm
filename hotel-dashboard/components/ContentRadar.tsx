'use client';

import { useState } from 'react';
import type { OutlierPost, TimeWindow } from '@/lib/data';
import { TIME_WINDOWS } from '@/lib/data';
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

// Framed image: shows the whole post at its true aspect ratio (contain), centred,
// with a blurred, tinted copy of the same image filling the letterbox gaps — a photo
// in a frame, not a photo trimmed to fit. Instagram posts come in three shapes
// (Reel 9:16, Carousel/Photo 4:5 or 1:1), so `cover` used to slice tall Reels; `contain`
// keeps every subject in view. `blur`/`elevated` scale the effect down for small thumbnails.
export function ImageWithFallback({
  src,
  alt,
  fallback,
  blur = 28,
  elevated = true,
}: {
  src: string | null;
  alt: string;
  fallback: string;
  blur?: number;
  elevated?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div style={{ position: 'absolute', inset: 0, background: fallback }} />;
  }
  // Instagram CDN images are external and short-lived — plain <img>s with a fallback.
  return (
    <>
      {/* 1 · blurred backdrop — same image, scaled up so the blur has no transparent edge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scale(1.15)',
          filter: `blur(${blur}px) brightness(0.82) saturate(1.05)`,
        }}
      />
      {/* 2 · foreground — whole image at true aspect, centred */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{
          position: 'absolute',
          inset: 0,
          margin: 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
          ...(elevated ? { boxShadow: '0 6px 22px -8px rgba(0,0,0,0.45)' } : null),
        }}
      />
    </>
  );
}

function permalink(p: OutlierPost): string {
  return p.post_url ?? `https://www.instagram.com/p/${p.post_id}/`;
}

// Small leading glyph so the post format reads at a glance. 24-unit viewBox,
// currentColor stroke/fill. Unknown/missing type → null (chip stays text-only).
function TypeIcon({ type }: { type: string }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    style: { display: 'block', flexShrink: 0 },
  } as const;
  // Instagram reels come through the pipeline as either 'Video' or 'Reel' (see
  // normalizeType in lib/data.ts) — both get the play triangle.
  if (type === 'Reel' || type === 'Video') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.5-6.5a1 1 0 0 0 0-1.72L9.52 4.64A1 1 0 0 0 8 5.5z" />
      </svg>
    );
  }
  if (type === 'Carousel') {
    return (
      <svg {...common} fill="none" stroke="currentColor">
        <rect x="7.5" y="3.5" width="13" height="13" rx="2.5" strokeWidth="1.7" />
        <path d="M4.5 7v11a2.5 2.5 0 0 0 2.5 2.5h9" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'Photo') {
    return (
      <svg {...common} fill="none" stroke="currentColor">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" strokeWidth="1.7" />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
        <path d="M5 18l4.5-4.5 3 2.5 3.5-3.5 4 4" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}

function TagChip({ type }: { type: string | null }) {
  if (!type || type === 'Other') return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
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
      <TypeIcon type={type} />
      {type}
    </span>
  );
}

// ─── Top-5 breakout card ──────────────────────────────────────────────────────
// Exported for reuse by the public landing page taster (components/Landing.tsx)
export function BreakoutCard({ post: p, rank }: { post: OutlierPost; rank: number }) {
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
          style={{ position: 'relative', minHeight: 400, height: '100%', overflow: 'hidden', display: 'block', background: MEDIA_PLACEHOLDER }}
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
        <ImageWithFallback src={p.image_url} alt={p.hotel_name} fallback={THUMB_PLACEHOLDER} blur={10} elevated={false} />
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

// ─── Live time-window toggle (matches the shell's PillToggle visual style) ────
function WindowToggle({ value, onChange }: { value: TimeWindow; onChange: (w: TimeWindow) => void }) {
  return (
    <div
      role="group"
      aria-label="Top posts time window"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--surface-alt-2)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {TIME_WINDOWS.map(w => {
        const active = w.key === value;
        return (
          <button
            key={w.key}
            type="button"
            onClick={() => onChange(w.key)}
            aria-pressed={active}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              border: 'none',
              borderRadius: 6,
              padding: '6px 13px',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'inherit',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--surface)' : 'var(--muted)',
              cursor: active ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {active && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />
            )}
            {w.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Feed filters (display-only, client-side) ─────────────────────────────────
// Each chip is an independent on/off include-toggle. A post is hidden only when
// its category's chip is off — turning "Videos" off hides Video/Reel posts,
// turning "Collaboration posts" off hides collabs. "Show all" turns them back on.
// This filters the DISPLAYED list only; it never changes breakout selection or
// the hero's "X posts outperformed" count (those come straight from the data).
type FeedFilters = { collab: boolean; images: boolean; videos: boolean };
const ALL_ON: FeedFilters = { collab: true, images: true, videos: true };

const isImage = (t: string | null) => t === 'Photo' || t === 'Carousel';
const isVideo = (t: string | null) => t === 'Video' || t === 'Reel';

function passesFilters(p: OutlierPost, f: FeedFilters): boolean {
  if (!f.images && isImage(p.type)) return false;
  if (!f.videos && isVideo(p.type)) return false;
  if (!f.collab && p.is_collab) return false;
  return true;
}

function FilterChip({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        border: `1px solid ${active ? 'var(--signal-deep)' : 'var(--line)'}`,
        background: active ? 'var(--top3-tint)' : 'var(--surface)',
        color: active ? 'var(--signal-deep)' : 'var(--muted)',
        borderRadius: 999,
        padding: '7px 14px',
        fontSize: 12.5,
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
        {active ? (
          <path d="M20 6.5 9.4 17 4 11.7" stroke="var(--signal-deep)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <circle cx="12" cy="12" r="8.2" stroke="var(--faint)" strokeWidth="1.7" />
        )}
      </svg>
      {label}
    </button>
  );
}

function FeedFilterBar({
  filters,
  onToggle,
  onShowAll,
  allOn,
  shown,
  total,
}: {
  filters: FeedFilters;
  onToggle: (k: keyof FeedFilters) => void;
  onShowAll: () => void;
  allOn: boolean;
  shown: number;
  total: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--muted)',
            marginRight: 2,
          }}
        >
          Filter
        </span>
        <FilterChip
          label="Collaboration posts"
          active={filters.collab}
          onClick={() => onToggle('collab')}
          title="Collabs with accounts outside our tracked hotels may not be flagged"
        />
        <FilterChip label="Images & carousels" active={filters.images} onClick={() => onToggle('images')} />
        <FilterChip label="Videos" active={filters.videos} onClick={() => onToggle('videos')} />
        <button
          type="button"
          onClick={onShowAll}
          disabled={allOn}
          className="cr-link"
          style={{
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'inherit',
            color: allOn ? 'var(--faint)' : 'var(--signal-deep)',
            background: 'transparent',
            border: 'none',
            cursor: allOn ? 'default' : 'pointer',
            padding: '4px 6px',
          }}
        >
          Show all
        </button>
        {!allOn && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Showing {shown} of {total}
          </span>
        )}
      </div>
      <span style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.5 }}>
        Collabs are flagged when a post appears on more than one tracked hotel’s grid — collabs with accounts outside our tracked hotels may not be caught.
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ContentRadar({ postsByWindow }: { postsByWindow: Record<TimeWindow, OutlierPost[]> }) {
  const [showMore, setShowMore] = useState(false);
  const [win, setWin] = useState<TimeWindow>('7d');
  const [filters, setFilters] = useState<FeedFilters>(ALL_ON);
  const allOn = filters.collab && filters.images && filters.videos;

  const windowPosts = postsByWindow[win];
  const posts = allOn ? windowPosts : windowPosts.filter(p => passesFilters(p, filters));

  const topPosts = posts.slice(0, 5);
  const rest = posts.slice(5);
  const visibleRest = showMore ? rest : rest.slice(0, 10);
  const hiddenCount = rest.length - 10;

  const toggle = (k: keyof FeedFilters) => {
    setFilters(f => ({ ...f, [k]: !f[k] }));
    setShowMore(false);
  };
  const showAll = () => {
    setFilters(ALL_ON);
    setShowMore(false);
  };

  const emptyMsg = win === '7d'
    ? 'No posts broke meaningfully past their hotel’s own median this week.'
    : 'No posts broke meaningfully past their hotel’s own median in this window.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Controls: time-window toggle + feed filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <WindowToggle value={win} onChange={w => { setWin(w); setShowMore(false); }} />
          {win === 'all' && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Top {windowPosts.length} best-performing posts on record
            </span>
          )}
        </div>
        <FeedFilterBar
          filters={filters}
          onToggle={toggle}
          onShowAll={showAll}
          allOn={allOn}
          shown={posts.length}
          total={windowPosts.length}
        />
      </div>

      {windowPosts.length === 0 ? (
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
          {emptyMsg}
        </div>
      ) : posts.length === 0 ? (
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
          No posts match these filters.{' '}
          <button
            type="button"
            onClick={showAll}
            className="cr-link"
            style={{ fontSize: 14, fontWeight: 500, fontFamily: 'inherit', color: 'var(--signal-deep)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Show all
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { OutlierPost } from '@/lib/data';

// ─── Signal accent for breakout multiplier badges ────────────────────────────
function accentFill(_multiplier: number): string {
  return 'rgba(91,155,170,0.12)';
}
function accentText(_multiplier: number): string {
  return 'var(--signal-deep)';
}

// ─── Tag colours ─────────────────────────────────────────────────────────────
const TAG_CONFIG: Record<string, { bg: string; border: string; text: string }> = {
  'Collaboration': { bg: 'rgba(91,155,170,.12)',  border: 'rgba(91,155,170,.35)',  text: '#3D7A8A' },
  'Notable guest': { bg: 'rgba(91,155,170,.10)',  border: 'rgba(91,155,170,.28)',  text: '#3D7A8A' },
  'Live moment':   { bg: 'rgba(91,155,170,.10)',  border: 'rgba(91,155,170,.28)',  text: '#3D7A8A' },
  'Craft':         { bg: 'rgba(91,155,170,.10)',  border: 'rgba(91,155,170,.28)',  text: '#3D7A8A' },
  'Organic':       { bg: 'rgba(154,143,126,.08)', border: 'rgba(154,143,126,.2)',  text: '#9A8F7E' },
  'Seasonal':      { bg: 'rgba(91,155,170,.10)',  border: 'rgba(91,155,170,.28)',  text: '#3D7A8A' },
  'Event':         { bg: 'rgba(61,122,138,.12)',  border: 'rgba(61,122,138,.35)',  text: '#3D7A8A' },
  'Property':      { bg: 'rgba(154,143,126,.08)', border: 'rgba(154,143,126,.2)',  text: '#9A8F7E' },
  'People':        { bg: 'rgba(91,155,170,.10)',  border: 'rgba(91,155,170,.28)',  text: '#3D7A8A' },
};

// Signal pill — marks detected content theme
function ThemeTag({ theme, large }: { theme: string | null; large?: boolean }) {
  if (!theme) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--signal)',
        color: '#fff',
        borderRadius: 999,
        padding: large ? '5px 14px' : '3px 10px',
        fontSize: large ? 12 : 11,
        fontFamily: 'var(--font-mono), monospace',
        fontWeight: 500,
        letterSpacing: '.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {theme}
    </span>
  );
}

function DriverTag({ tag, large }: { tag: string | null; large?: boolean }) {
  if (!tag) return null;
  const cfg = TAG_CONFIG[tag] ?? { bg: 'rgba(118,116,106,.08)', border: 'rgba(118,116,106,.2)', text: '#76746A' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
        borderRadius: 999,
        padding: large ? '5px 13px' : '3px 10px',
        fontSize: large ? 12 : 11,
        fontWeight: 500,
        letterSpacing: '.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {tag}
    </span>
  );
}

function UpliftChip({ value }: { value: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(91,155,170,.10)',
        border: '1px solid rgba(91,155,170,.28)',
        color: 'var(--signal-deep)',
        borderRadius: 999,
        padding: '2px 9px',
        fontSize: 11,
        fontFamily: 'var(--font-mono), monospace',
        fontWeight: 500,
        letterSpacing: '.01em',
      }}
    >
      ↑{value.toFixed(1)}×
    </span>
  );
}

function fmtFollowers(n: number | null): string | null {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
}

function fmtPostedAt(iso: string): string {
  const d = new Date(iso);
  const day  = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

function ImageWithFallback({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, var(--card-soft) 0%, var(--line) 100%)',
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      onError={() => setFailed(true)}
    />
  );
}

function permalink(p: OutlierPost): string {
  return p.post_url ?? `https://www.instagram.com/p/${p.post_id}/`;
}

// ─── FORMAT 1: Large editorial card — ≥ 5× ───────────────────────────────────
function LargeCard({ post: p }: { post: OutlierPost }) {
  const followersStr = fmtFollowers(p.hotel_followers);
  const meta = [p.hotel_country, followersStr ? `${followersStr} followers` : null]
    .filter(Boolean).join(' · ');
  const fill = accentFill(p.multiplier);
  const text = accentText(p.multiplier);

  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="large-card-layout">
        {/* Image */}
        <a
          href={permalink(p)}
          target="_blank"
          rel="noopener noreferrer"
          className="large-card-image"
        >
          <ImageWithFallback src={p.image_url} alt={p.hotel_name} />
          {p.type && p.type !== 'Other' && (
            <span
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(32,32,26,.72)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                fontSize: 10,
                fontFamily: 'var(--font-mono), monospace',
                fontWeight: 500,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                borderRadius: 6,
                padding: '3px 8px',
              }}
            >
              {p.type}
            </span>
          )}
        </a>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: '36px 40px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            minWidth: 0,
          }}
        >
          {/* Multiplier */}
          <div style={{ paddingBottom: 4 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontWeight: 500,
                fontSize: 56,
                lineHeight: 1,
                color: fill,
                letterSpacing: '-.03em',
              }}
            >
              {p.multiplier.toFixed(1)}×
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              vs hotel baseline
            </div>
          </div>

          {/* Hotel */}
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>
              {p.hotel_name}
            </div>
            {meta && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{meta}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 5, fontFamily: 'var(--font-mono), monospace', fontWeight: 500 }}>
              {fmtPostedAt(p.posted_at)}
            </div>
          </div>

          {/* Baseline comparison bars */}
          {p.hotel_typical_total !== null && (() => {
            const thisPost = p.likes_count + p.comments_count;
            const typical  = Math.round(p.hotel_typical_total!);
            const typicalPct = Math.max(4, Math.min(96, (typical / Math.max(thisPost, 1)) * 100));
            const rows = [
              { label: 'Typical',   value: typical,  pct: typicalPct, bar: 'var(--line-strong)', num: 'var(--faint)' },
              { label: 'This post', value: thisPost,  pct: 100,        bar: fill,                 num: 'var(--ink)'   },
            ];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--faint)', width: 52, flexShrink: 0 }}>
                      {row.label}
                    </span>
                    <div style={{ flex: 1, height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${row.pct}%`, height: '100%', background: row.bar, borderRadius: 2, transition: 'width 400ms ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, color: row.num, width: 64, textAlign: 'right', flexShrink: 0 }}>
                      {row.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Metric pair */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Likes',    val: p.likes_count,    mult: p.likes_multiple,    typ: p.hotel_typical_likes },
              { label: 'Comments', val: p.comments_count, mult: p.comments_multiple, typ: p.hotel_typical_comments },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--card-soft)', borderRadius: 10, border: '1px solid var(--line)', padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  {m.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 500, fontSize: 24, color: 'var(--ink)', letterSpacing: '-.02em', lineHeight: 1 }}>
                    {m.val.toLocaleString()}
                  </span>
                  <UpliftChip value={m.mult} />
                </div>
                {m.typ !== null && (
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 5, fontFamily: 'var(--font-mono), monospace', fontWeight: 500 }}>
                    vs typical {Math.round(m.typ).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Theme + driver tag + insight */}
          {(p.theme_tag || p.driver_tag || p.post_insight) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(p.theme_tag || p.driver_tag) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <ThemeTag theme={p.theme_tag} large />
                  <DriverTag tag={p.driver_tag} large />
                </div>
              )}
              {p.post_insight && (
                <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                  &ldquo;{p.post_insight}&rdquo;
                </p>
              )}
            </div>
          )}

          <a
            href={permalink(p)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: 'auto', fontSize: 12, color: text, textDecoration: 'none', fontWeight: 500 }}
          >
            View on Instagram ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── FORMAT 2: Small compact row — 2–5× ──────────────────────────────────────
function SmallCard({ post: p }: { post: OutlierPost }) {
  const [hovered, setHovered] = useState(false);
  const followersStr = fmtFollowers(p.hotel_followers);
  const meta = [p.hotel_country, followersStr ? `${followersStr} followers` : null]
    .filter(Boolean).join(' · ');
  const fill = accentFill(p.multiplier);

  return (
    <a
      href={permalink(p)}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--card)',
        borderRadius: 10,
        border: `1px solid ${hovered ? 'var(--line-strong)' : 'var(--line)'}`,
        overflow: 'hidden',
        boxShadow: hovered ? 'var(--shadow-lift)' : 'var(--shadow)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 80,
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: 80, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
        <ImageWithFallback src={p.image_url} alt={p.hotel_name} />
        {p.type && p.type !== 'Other' && (
          <span
            style={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              background: 'rgba(32,32,26,.7)',
              color: '#fff',
              fontSize: 8,
              fontFamily: 'var(--font-mono), monospace',
              fontWeight: 500,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              borderRadius: 4,
              padding: '2px 4px',
            }}
          >
            {p.type}
          </span>
        )}
      </div>

      {/* Multiplier */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRight: '1px solid var(--line)',
          minWidth: 68,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontWeight: 500,
            fontSize: 22,
            color: fill,
            lineHeight: 1,
            letterSpacing: '-.02em',
          }}
        >
          {p.multiplier.toFixed(1)}×
        </div>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, color: 'var(--faint)', marginTop: 3, letterSpacing: '.05em', textTransform: 'uppercase' }}>
          baseline
        </div>
      </div>

      {/* Hotel + stats */}
      <div
        style={{
          flex: 1,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.hotel_name}
        </div>
        {meta && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{meta}</div>}
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono), monospace', fontWeight: 500 }}>
          ↑{p.likes_multiple.toFixed(1)}× likes{'  ·  '}↑{p.comments_multiple.toFixed(1)}× comments
        </div>
        <div style={{ fontSize: 11, color: 'var(--faint)', fontFamily: 'var(--font-mono), monospace', fontWeight: 500 }}>
          {fmtPostedAt(p.posted_at)}
        </div>
      </div>

      {/* Right column: tags + insight */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 5,
          maxWidth: 200,
        }}
      >
        {(p.theme_tag || p.driver_tag) && (
          <>
            <ThemeTag theme={p.theme_tag} />
            <DriverTag tag={p.driver_tag} />
          </>
        )}
        {p.post_insight && (
          <p style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5, margin: 0, textAlign: 'right' }}>
            {p.post_insight}
          </p>
        )}
      </div>
    </a>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ContentRadar({ posts }: { posts: OutlierPost[] }) {
  const [showMore, setShowMore] = useState(false);

  // Top 5 by multiplier → editorial large cards
  // Next 10 → always-visible compact rows
  // Posts 16+ → revealed by "see more"
  const topPosts    = posts.slice(0, 5);
  const nextTen     = posts.slice(5, 15);
  const morePosts   = posts.slice(15);
  const visibleMore = showMore ? morePosts : morePosts.slice(0, 10);
  const hiddenCount = !showMore && morePosts.length > 0 ? morePosts.length : 0;

  if (posts.length === 0) {
    return (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--line)',
          padding: '56px 40px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 14,
        }}
      >
        No posts broke meaningfully past their hotel&rsquo;s own baseline this week.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

      {/* Top 5 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--faint)' }}>
          Five best performing posts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {topPosts.map(p => <LargeCard key={p.post_id} post={p} />)}
        </div>
      </div>

      {/* Next 10 — always visible compact rows */}
      {nextTen.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--faint)' }}>
            Next best performing posts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {nextTen.map(p => <SmallCard key={p.post_id} post={p} />)}
          </div>
        </div>
      )}

      {/* Posts 16+ — revealed by "see more" */}
      {morePosts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {showMore && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleMore.map(p => <SmallCard key={p.post_id} post={p} />)}
            </div>
          )}
          {hiddenCount > 0 && (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <button
                onClick={() => setShowMore(true)}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '8px 24px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                See more ({hiddenCount} post{hiddenCount !== 1 ? 's' : ''})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

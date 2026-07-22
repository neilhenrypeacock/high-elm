'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { OutlierPost, TimeWindow } from '@/lib/data';
import { TIME_WINDOWS, parseInsight } from '@/lib/data';
import { postKey } from '@/lib/post-key';
import { fmtFollowers, fmtPostedAt } from '@/lib/format';
import { accreditationsFor } from '@/lib/accreditations';
import { AccreditationPins } from './HotelTable';
import SaveToggle from './SaveToggle';

// Save control for a post — same bodies/endpoint everywhere so the affordance is
// identical on the big cards, the compact rows, and the Saved page.
function PostSaveToggle({
  post,
  saved,
  onSavedChange,
  variant,
}: {
  post: OutlierPost;
  saved: boolean;
  onSavedChange?: (s: boolean) => void;
  variant: 'overlay' | 'inline';
}) {
  return (
    <SaveToggle
      initialSaved={saved}
      endpoint="/api/saves"
      saveBody={{ post }}
      deleteBody={{ post_id: post.post_id, instagram_handle: post.instagram_handle }}
      label="Save post"
      savedLabel="Saved — remove"
      onChange={onSavedChange}
      variant={variant}
    />
  );
}

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";
const DISPLAY = "var(--font-display), 'Space Grotesk', sans-serif";
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

// Framed image. Two modes:
//   • backdrop=true  — whole image at true aspect (contain), centred, over a blurred
//                      tinted copy of itself that fills the letterbox gaps. Used by the
//                      landing taster and the Your Hotel cards.
//   • backdrop=false — the preview FLOATS on the card surface at its true aspect ratio,
//                      no fill, no crop — a photo dropped on the card. Used by the
//                      Top-posts breakout cards (the card behind it must be --surface).
// Instagram posts come in three shapes (Reel 9:16, Carousel/Photo 4:5 or 1:1); `contain`
// keeps every subject in view. `blur`/`elevated` scale the effect down for thumbnails.
export function ImageWithFallback({
  src,
  alt,
  fallback,
  blur = 28,
  elevated = true,
  backdrop = true,
}: {
  src: string | null;
  alt: string;
  fallback: string;
  blur?: number;
  elevated?: boolean;
  /** false → float the preview on the card surface (no blurred fill behind it). */
  backdrop?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div style={{ position: 'absolute', inset: 0, background: fallback }} />;
  }
  // Instagram CDN images are external and short-lived — plain <img>s with a fallback.
  return (
    <>
      {/* 1 · blurred backdrop — same image, scaled up so the blur has no transparent edge */}
      {backdrop && (
        /* eslint-disable-next-line @next/next/no-img-element */
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
      )}
      {/* 2 · foreground — whole image at true aspect, centred (floats when no backdrop) */}
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
          // Float mode: cap the preview BELOW the frame size so it always keeps a
          // margin on every side. An inset alone doesn't work — maxWidth/Height:100%
          // resolve against the whole frame, so a contained image scales to the
          // edges. Capping at calc(100% − 88px) + margin:auto centres it with a
          // guaranteed 44px of breathing room per side, whatever the aspect ratio.
          maxWidth: backdrop ? '100%' : 'calc(100% - 88px)',
          maxHeight: backdrop ? '100%' : 'calc(100% - 88px)',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
          ...(backdrop
            ? elevated
              ? { boxShadow: '0 6px 22px -8px rgba(0,0,0,0.45)' }
              : null
            : { borderRadius: 10, boxShadow: '0 12px 28px -10px rgba(38,36,32,0.34)' }),
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
// Exported for reuse by the Your Hotel page (components/YourHotel.tsx).
export function TypeIcon({ type }: { type: string }) {
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

// Exported for reuse by the Your Hotel page (components/YourHotel.tsx).
export function TagChip({ type }: { type: string | null }) {
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

// ─── AI insight — the parsed "what it is / why it worked / consider this" note ─
// Reads the stored post_insight blob (parseInsight splits it). Leads with the
// punchy "why it worked" line and tucks the rest behind an inline "Read more"
// so the card stops sprawling. Short free-form notes render as a single line.
const INSIGHT_CARD: React.CSSProperties = {
  background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: 10, padding: '13px 15px',
};
const INSIGHT_BODY: React.CSSProperties = {
  fontSize: 13, color: 'var(--body-strong)', lineHeight: 1.55, margin: 0,
};
const INSIGHT_CLAMP2: React.CSSProperties = {
  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
};

function InsightLabel() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: LABEL, fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.14em', color: 'var(--signal-deep)', marginBottom: 7,
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
      </svg>
      AI insight
    </div>
  );
}
function InsightHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: LABEL, fontSize: 8.5, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.1em', color: 'var(--faint)', marginBottom: 2,
    }}>{children}</div>
  );
}

function AiInsight({ insight }: { insight: string }) {
  const [open, setOpen] = useState(false);
  const parsed = parseInsight(insight);
  if (!parsed) return null;
  const { whatItIs, whyItWorked, considerThis, freeform } = parsed;

  // Short, unstructured note → a single clean line, no read-more.
  if (freeform) {
    return <div style={INSIGHT_CARD}><InsightLabel /><p style={INSIGHT_BODY}>{freeform}</p></div>;
  }

  // Canonical order: what it is (context) · why it worked (hero) · consider this (action).
  const sections = [
    { key: 'what', head: 'What it is',    text: whatItIs },
    { key: 'why',  head: 'Why it worked', text: whyItWorked },
    { key: 'do',   head: 'Consider this', text: considerThis },
  ].filter((s): s is { key: string; head: string; text: string } => !!s.text);
  if (sections.length === 0) return null;

  const lead = sections.find(s => s.key === 'why') ?? sections[0];
  const canExpand = sections.length > 1;

  return (
    <div style={INSIGHT_CARD}>
      <InsightLabel />
      {open ? (
        sections.map((s, i) => (
          <div key={s.key} style={{ marginTop: i === 0 ? 0 : 9 }}>
            <InsightHead>{s.head}</InsightHead>
            <p style={INSIGHT_BODY}>{s.text}</p>
          </div>
        ))
      ) : (
        <>
          <InsightHead>{lead.head}</InsightHead>
          <p style={{ ...INSIGHT_BODY, ...INSIGHT_CLAMP2 }}>{lead.text}</p>
        </>
      )}
      {canExpand && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            marginTop: 9, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: LABEL, fontSize: 11, fontWeight: 600, color: 'var(--signal-deep)',
          }}
        >
          {open ? 'Show less' : 'Read more'}
          <span aria-hidden="true" style={{ fontSize: 9 }}>{open ? '▲' : '▼'}</span>
        </button>
      )}
    </div>
  );
}

// ─── Top-5 breakout card ──────────────────────────────────────────────────────
// Exported for reuse by the public landing page taster (components/Landing.tsx)
export function BreakoutCard({
  post: p,
  rank,
  saved,
  onSavedChange,
}: {
  post: OutlierPost;
  rank?: number;
  /** When defined, renders the Save control seeded with this state. */
  saved?: boolean;
  onSavedChange?: (s: boolean) => void;
}) {
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
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {saved !== undefined && (
        <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
          <PostSaveToggle post={p} saved={saved} onSavedChange={onSavedChange} variant="overlay" />
        </div>
      )}
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
          style={{ position: 'relative', minHeight: 400, height: '100%', overflow: 'hidden', display: 'block', background: 'var(--surface)' }}
          aria-label={`View ${p.hotel_name}'s post on Instagram`}
        >
          <ImageWithFallback src={p.image_url} alt={p.hotel_name} fallback={MEDIA_PLACEHOLDER} backdrop={false} />
          <span style={{ position: 'absolute', top: 14, left: 14 }}>
            <TagChip type={p.type} />
          </span>
          {rank !== undefined && (
            <span
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--faint)',
              }}
            >
              Rank {String(rank).padStart(2, '0')}
            </span>
          )}
        </a>

        {/* Content */}
        <div className="cr-card-body" style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {/* Editor's Pick — a curated "worth replicating" flag (standout_posts.editors_pick) */}
          {p.editors_pick && (
            <span
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: LABEL,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--signal-deep)',
                background: 'var(--top3-tint)',
                border: '1px solid #BFD8CC',
                borderRadius: 999,
                padding: '4px 11px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
                <path d="M12 2.6l2.7 5.9 6.4.7-4.8 4.3 1.3 6.3L12 16.9 6.4 20.1l1.3-6.3L2.9 9.5l6.4-.7z" />
              </svg>
              Editor&rsquo;s Pick
            </span>
          )}
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
              vs last 30<br />posts
            </span>
          </div>

          {/* Hotel */}
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.25 }}>
              {p.hotel_name}
            </div>
            {meta && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>{meta}</div>}
            <AccreditationPins labels={accreditationsFor(p.instagram_handle)} />
          </div>

          {/* AI insight — parsed "what it is / why it worked / consider this",
              leading with why-it-worked, the rest behind an inline read-more */}
          {p.post_insight && <AiInsight insight={p.post_insight} />}

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
                    vs last 30 posts {Math.round(cell.typical).toLocaleString('en-GB')}
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
function PostRow({
  post: p,
  rank,
  saved,
  onSavedChange,
}: {
  post: OutlierPost;
  rank: number;
  saved?: boolean;
  onSavedChange?: (s: boolean) => void;
}) {
  const followersStr = fmtFollowers(p.hotel_followers);
  const sub = [p.hotel_country, followersStr !== '—' ? `${followersStr} followers` : null]
    .filter(Boolean)
    .join(' · ');

  const hasSave = saved !== undefined;

  return (
    <div style={{ position: 'relative' }}>
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
        paddingRight: hasSave ? 62 : 24,
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
          vs last 30 posts
        </span>
      </span>

      <span className="cr-row-date" style={{ fontSize: 12, color: 'var(--faint)', width: 120, textAlign: 'right', flexShrink: 0 }}>
        {fmtPostedAt(p.posted_at)}
      </span>
    </a>
    {hasSave && (
      <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
        <PostSaveToggle post={p} saved={saved!} onSavedChange={onSavedChange} variant="inline" />
      </div>
    )}
    </div>
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
              background: active ? 'var(--fill-strong)' : 'transparent',
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
// Each format is an independent on/off include-toggle. A post is hidden only when
// its category is off — turning "Videos" off hides Video/Reel posts, turning
// "Collaboration posts" off hides collabs. "Reset filters" restores the defaults.
// This filters the DISPLAYED list only; it never changes breakout selection or
// the hero's "X posts outperformed" count (those come straight from the data).
type FeedFilters = { collab: boolean; images: boolean; videos: boolean };
// The feed opens on Images & carousels + Videos, collabs hidden. Not persisted —
// every session starts here (the product leads with this week's signal, not an
// archive), so a reload always returns to these defaults.
const DEFAULT_FILTERS: FeedFilters = { collab: false, images: true, videos: true };

// The collaboration caveat — an honesty note about a real data limitation. Shown
// verbatim behind the ⓘ next to "Collaboration posts" in the Format dropdown.
const COLLAB_CAVEAT =
  'Collaboration posts are true Instagram Collabs — posts co-authored by two accounts (the “X and Y” byline), including partners outside our tracked hotels. Posts that only mention or tag a partner in the caption aren’t counted.';

// Feed shape: the top BIG_CARDS breakouts render as big cards; everything below
// is a ranked list of compact rows, revealed SMALL_STEP at a time via "Show more".
const BIG_CARDS = 10;
const SMALL_STEP = 20;

const isImage = (t: string | null) => t === 'Photo' || t === 'Carousel';
const isVideo = (t: string | null) => t === 'Video' || t === 'Reel';

function passesFilters(p: OutlierPost, f: FeedFilters): boolean {
  if (!f.images && isImage(p.type)) return false;
  if (!f.videos && isVideo(p.type)) return false;
  if (!f.collab && p.is_collab) return false;
  return true;
}

// ─── ⓘ tooltip — hover on desktop, tap on touch. The simplest possible one, no
// dependency: a button that reveals an absolutely-positioned note. ────────────
function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        // Inside a <label>: preventDefault stops the click toggling the checkbox;
        // stopPropagation keeps the dropdown's outside-click handler from firing.
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        onBlur={() => setOpen(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, flex: 'none', padding: 0, borderRadius: '50%',
          border: '1px solid var(--line-accent)', background: 'transparent',
          color: 'var(--muted)', cursor: 'pointer',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="7.4" r="1.3" fill="currentColor" />
          <path d="M12 11v6.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 40,
            width: 262, padding: '10px 12px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-nav)', color: 'var(--body-strong)',
            fontSize: 11.5, lineHeight: 1.5, fontWeight: 400,
            textTransform: 'none', letterSpacing: 'normal', whiteSpace: 'normal',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

const FORMAT_OPTIONS: { key: keyof FeedFilters; label: string; caveat?: string }[] = [
  { key: 'images', label: 'Images & carousels' },
  { key: 'videos', label: 'Videos' },
  { key: 'collab', label: 'Collaboration posts', caveat: COLLAB_CAVEAT },
];

// Format refinement — a quieter dropdown (lighter border + muted text) to the
// right of the time window, which stays the dominant control. Shows "· N of 3"
// whenever the selection is away from default, so active filtering is visible
// without opening it.
function FormatDropdown({
  filters,
  onToggle,
}: {
  filters: FeedFilters;
  onToggle: (k: keyof FeedFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onCount = (filters.images ? 1 : 0) + (filters.videos ? 1 : 0) + (filters.collab ? 1 : 0);
  const atDefault =
    filters.images === DEFAULT_FILTERS.images &&
    filters.videos === DEFAULT_FILTERS.videos &&
    filters.collab === DEFAULT_FILTERS.collab;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1px solid var(--line)', background: 'var(--surface)',
          color: 'var(--muted)', borderRadius: 10, padding: '8px 13px',
          fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span>Format</span>
        {!atDefault && (
          <span style={{ color: 'var(--signal-deep)', fontWeight: 600 }}>· {onCount} of 3</span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="group"
          aria-label="Filter by format"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
            width: 236, padding: 6, borderRadius: 12,
            background: 'var(--surface)', border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-nav)',
          }}
        >
          {FORMAT_OPTIONS.map(o => (
            <label
              key={o.key}
              className="cr-shell-navitem"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, color: 'var(--body-strong)',
              }}
            >
              <input
                type="checkbox"
                checked={filters[o.key]}
                onChange={() => onToggle(o.key)}
                style={{ width: 15, height: 15, accentColor: 'var(--signal-deep)', cursor: 'pointer', flex: 'none' }}
              />
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.caveat && <InfoTip text={o.caveat} label="About collaboration posts" />}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ContentRadar({
  postsByWindow,
  savedPostKeys = [],
}: {
  postsByWindow: Record<TimeWindow, OutlierPost[]>;
  savedPostKeys?: string[];
}) {
  // How many compact rows are revealed below the big cards. Starts at 0 (the feed
  // opens on the big cards alone); each "Show more" click appends SMALL_STEP more.
  const [smallShown, setSmallShown] = useState(0);
  const [win, setWin] = useState<TimeWindow>('7d');
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const allFormatsOn = filters.collab && filters.images && filters.videos;
  const atDefaultFilters =
    filters.images === DEFAULT_FILTERS.images &&
    filters.videos === DEFAULT_FILTERS.videos &&
    filters.collab === DEFAULT_FILTERS.collab;
  const savedSet = useMemo(() => new Set(savedPostKeys), [savedPostKeys]);

  const windowPosts = postsByWindow[win];
  const posts = allFormatsOn ? windowPosts : windowPosts.filter(p => passesFilters(p, filters));

  const bigPosts = posts.slice(0, BIG_CARDS);
  const rest = posts.slice(BIG_CARDS);
  const visibleRest = rest.slice(0, smallShown);
  const remaining = rest.length - visibleRest.length;

  const toggle = (k: keyof FeedFilters) => {
    setFilters(f => ({ ...f, [k]: !f[k] }));
    setSmallShown(0);
  };
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSmallShown(0);
  };

  const windowPhrase = (TIME_WINDOWS.find(w => w.key === win)?.label ?? '').toLowerCase();

  const emptyMsg = win === '7d'
    ? 'No posts broke meaningfully past their hotel’s own median this week.'
    : 'No posts broke meaningfully past their hotel’s own median in this window.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Controls — one row: dominant time window (left) + quieter Format (right),
          with a single quiet status line beneath. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <WindowToggle value={win} onChange={w => { setWin(w); setSmallShown(0); }} />
          <FormatDropdown filters={filters} onToggle={toggle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {windowPosts.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Showing {posts.length} of {windowPosts.length} breakout posts · {windowPhrase}
            </span>
          )}
          {!atDefaultFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="cr-link"
              style={{
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'inherit',
                color: 'var(--signal-deep)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Reset filters
            </button>
          )}
        </div>
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
            onClick={resetFilters}
            className="cr-link"
            style={{ fontSize: 14, fontWeight: 500, fontFamily: 'inherit', color: 'var(--signal-deep)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Reset filters
          </button>
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Top 10 — big cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Eyebrow>Top {bigPosts.length}</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {bigPosts.map((p, i) => (
            <BreakoutCard
              key={`${p.post_id}-${p.instagram_handle}`}
              post={p}
              rank={i + 1}
              saved={savedSet.has(postKey(p.post_id, p.instagram_handle))}
            />
          ))}
        </div>
      </div>

      {/* Ranked below the top 10 — compact rows, revealed SMALL_STEP at a time */}
      {rest.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visibleRest.length > 0 && (
            <>
              <Eyebrow>Ranked {BIG_CARDS + 1} – {BIG_CARDS + visibleRest.length}</Eyebrow>
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
                  <PostRow
                    key={`${p.post_id}-${p.instagram_handle}`}
                    post={p}
                    rank={i + BIG_CARDS + 1}
                    saved={savedSet.has(postKey(p.post_id, p.instagram_handle))}
                  />
                ))}
              </div>
            </>
          )}
          {remaining > 0 && (
            <div style={{ textAlign: 'center', marginTop: visibleRest.length > 0 ? 4 : 0 }}>
              <button
                onClick={() => setSmallShown(n => n + SMALL_STEP)}
                className="cr-expander"
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  color: 'var(--signal-deep)',
                  background: 'var(--surface)',
                  border: '1px solid var(--line-accent)',
                  borderRadius: 10,
                  padding: '11px 24px',
                  cursor: 'pointer',
                }}
              >
                Show {Math.min(SMALL_STEP, remaining)} more ↓
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

'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { DashboardData, OutlierPost } from '@/lib/data';
import { hasVisibleLikesCount, parseInsight } from '@/lib/data';
import {
  FOUNDING_PRICE_DISPLAY,
  FOUNDING_PRICE_MONTHLY,
  STANDARD_PRICE_DISPLAY,
  STANDARD_PRICE_MONTHLY,
  placesLeftLine,
  foundingHeroLine,
  TRIAL_DAYS,
  TRIAL_FINE_PRINT,
  VALUE_STACK,
  VALUE_STACK_TOTAL_GBP,
  monthlyCost,
} from '@/lib/pricing';
import { belowCap, formatMultiplier, isCappedMultiplier } from '@/lib/format-multiplier';
import { ImageWithFallback } from './ContentRadar';

// ─── Offer ───────────────────────────────────────────────────────────────────
// Every price and seat number on this page comes from lib/pricing.ts. Do not
// write one by hand here.
const TRIAL_HREF = '/start-trial';
const LOGIN_HREF = '/login';

// The founding sentence and the scarcity line both need a live seat count, so
// they are built per render from the `placesLeft` prop rather than at module
// scope. When the count is unavailable the hero falls back to the half of the
// sentence that is always true, and the scarcity line is dropped entirely — a
// missing claim beats a guessed one.
const HERO_FOUNDING_LINE_NO_COUNT = `Founding membership — ${FOUNDING_PRICE_MONTHLY} locked for life.`;

const INNER: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 40px' };

// Green gradient placeholders behind taster thumbnails; a real image (if any)
// layers on top and covers, falling back to the gradient when the URL 404s.
const TASTER_GRADIENTS = [
  'linear-gradient(150deg,#1B4A37,#2E7357 55%,#7FC1A2)',
  'linear-gradient(150deg,#14382B,#1B4A37 60%,#2E7357)',
  'linear-gradient(150deg,#2E7357,#7FC1A2 55%,#9DBBA9)',
];

// ─── Local helpers (kept out of lib/data so this stays a lean client bundle) ──
function typeLabel(t: string | null): string {
  switch ((t ?? '').toLowerCase()) {
    case 'sidecar': return 'Carousel';
    case 'image':   return 'Photo';
    case 'video':   return 'Video';
    case 'reel':    return 'Reel';
    default:        return 'Post';
  }
}

/** "2 Jul" — pinned to UTC so SSR (UTC) and the browser agree. */
function fmtDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function fmtLikes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString('en-GB');
}

// ─── Small inline SVGs (from the handoff; no external assets) ─────────────────
const HeartIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
    <path d="M12 20s-7-4.3-9.4-8.4C1.1 8.7 2.6 5.2 6 5.2c2 0 3.2 1.2 4 2.4 0.8-1.2 2-2.4 4-2.4 3.4 0 4.9 3.5 3.4 6.4C19 15.7 12 20 12 20z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const CommentIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
    <path d="M20.5 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.3-3.9A7.5 7.5 0 1 1 20.5 11.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

// ─── Shared bits ──────────────────────────────────────────────────────────────
const eyebrow = (color = 'var(--signal-deep)'): React.CSSProperties => ({
  fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.16em',
  textTransform: 'uppercase', color,
});
const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)',
  lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)', textWrap: 'balance',
};

// Fine print on the dark bands. Deliberately one step brighter than
// --on-dark-soft (#A49D92), which is tuned for body copy and drops below a
// comfortable read at 12–13px — especially on the --signal-deep green.
const ON_DARK_FINEPRINT = '#CFCAC2';

// Accreditation chips. One shape, three tints — on --page/--surface, on
// --ink-deep, and on --signal-deep.
const listChip = (tone: 'light' | 'ink' | 'green'): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center',
  fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11.5, letterSpacing: '0.02em',
  borderRadius: 8, padding: '6px 12px', whiteSpace: 'nowrap',
  color: tone === 'light' ? 'var(--body-soft)' : 'var(--page)',
  background: tone === 'light' ? 'var(--surface)'
    : tone === 'ink' ? 'rgba(247,246,242,0.06)'
    : 'rgba(247,246,242,0.07)',
  border: `1px solid ${
    tone === 'light' ? 'var(--line-accent)'
      : tone === 'ink' ? 'var(--line-dark)'
      : 'rgba(247,246,242,0.16)'
  }`,
});

function CtaArrow() {
  return <span className="cr-cta-arrow">→</span>;
}

/** The "What this means" disclosure on each What-you-get card. Native <details>
 *  so it works without JS and is keyboard-operable for free; the marker is
 *  suppressed in globals.css (.cr-wyg-details) and replaced by the chevron. */
function WhatThisMeans({ children }: { children: React.ReactNode }) {
  return (
    <details className="cr-wyg-details" style={{ marginTop: 14 }}>
      <summary style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', listStyle: 'none',
        fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11.5, letterSpacing: '0.02em',
        color: 'var(--signal-deep)',
      }}>
        <span className="cr-wyg-summary-label">What this means</span>
        <svg className="cr-wyg-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flex: 'none', transition: 'transform .18s' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--body-soft)', margin: '12px 0 0', maxWidth: 'none', textWrap: 'pretty' }}>
        {children}
      </p>
    </details>
  );
}

// ─── Hero: fanned breakout-card stack (real data, top 1-3 by multiplier) ─────
// front = best post, centered, no rotation; up to two "peek" cards float
// behind it (rank 2 top-left, rank 3 bottom-right). Position/rotation come
// from the design handoff; only the front card shows insight + likes/comments.
function FanCard({
  post, index, front, rotateDeg, animationDuration, animationDelay, position,
}: {
  post: OutlierPost; index: number; front: boolean; rotateDeg: number;
  animationDuration: number; animationDelay: number; position: React.CSSProperties;
}) {
  const gradient = TASTER_GRADIENTS[index % TASTER_GRADIENTS.length];
  const chip = post.theme_tag ? `${typeLabel(post.type)} · ${post.theme_tag}` : typeLabel(post.type);
  const mult = formatMultiplier(post.multiplier);

  return (
    <div
      data-float
      data-hero-back={front ? undefined : true}
      style={{
        ...position,
        '--cr-rot': `${rotateDeg}deg`,
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
        overflow: 'hidden', boxShadow: front ? 'var(--shadow-hover)' : 'var(--shadow-card)',
        animation: `cr-hero-card-float ${animationDuration}s ease-in-out ${animationDelay}s infinite`,
      } as React.CSSProperties}
    >
      <div style={{ aspectRatio: '4 / 5', background: gradient, position: 'relative', overflow: 'hidden' }}>
        <ImageWithFallback src={post.image_url} alt={post.hotel_name} fallback={gradient} />
        <span style={{
          position: 'absolute', top: front ? 14 : 12, left: front ? 14 : 12, fontFamily: 'var(--font-label)', fontWeight: 600,
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)',
          background: 'rgba(29,27,23,0.32)', padding: front ? '5px 10px' : '4px 9px', borderRadius: 20,
        }}>{chip}</span>
        <span style={{
          position: 'absolute', top: front ? 14 : 12, right: front ? 14 : 12, fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: front ? 18 : 15, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', color: 'var(--ink-deep)',
          background: 'var(--surface)', padding: front ? '5px 12px' : '4px 10px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>{mult}</span>
      </div>
      {/* All three cards share one footer: just the hotel name (date + likes live
          on the detailed taster cards below). Keeps the fanned stack consistent —
          image, multiplier badge, hotel name — front card only larger. */}
      <div style={{ padding: front ? '16px 18px' : '11px 14px' }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: front ? 16 : 12.5,
          color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{post.hotel_name}</div>
      </div>
    </div>
  );
}

// ─── Taster: open card (real breakout, live data) ────────────────────────────
function OpenCard({ post, index }: { post: OutlierPost; index: number }) {
  const gradient = TASTER_GRADIENTS[index % TASTER_GRADIENTS.length];
  const chip = post.theme_tag ? `${typeLabel(post.type)} · ${post.theme_tag}` : typeLabel(post.type);
  const mult = formatMultiplier(post.multiplier);
  // The count-up animates towards a number, so it can only run on a precise
  // figure — a capped card would tick up to "50×" and lose the "+". Capped cards
  // simply render the static label instead.
  const counts = !isCappedMultiplier(post.multiplier);

  return (
    <div
      data-reveal data-reveal-delay={index * 90} data-card
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
        overflow: 'hidden', boxShadow: 'var(--shadow-card)', transition: 'transform .16s, box-shadow .16s',
      }}
    >
      <div style={{ aspectRatio: '4 / 5', background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
        <ImageWithFallback src={post.image_url} alt={post.hotel_name} fallback={gradient} backdrop={false} />
        <span style={{
          position: 'absolute', top: 14, left: 14, fontFamily: 'var(--font-label)', fontWeight: 600,
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)',
          background: 'rgba(29,27,23,0.32)', backdropFilter: 'blur(4px)', padding: '5px 10px', borderRadius: 20,
        }}>{chip}</span>
        <span
          data-count={counts ? post.multiplier.toFixed(1) : undefined} data-dec="1" data-suffix="×"
          style={{
            position: 'absolute', top: 14, right: 14, fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 18, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', color: 'var(--ink-deep)',
            background: 'var(--surface)', padding: '5px 12px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >{mult}</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{post.hotel_name}</div>
        <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', color: 'var(--body-mid)', margin: '3px 0 14px' }}>
          {[post.hotel_country, fmtDayMonth(post.posted_at)].filter(Boolean).join(' · ')}
        </div>
        {post.post_insight && (
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--body-soft)', marginBottom: 16 }}>{post.post_insight}</p>
        )}
        <div style={{ display: 'flex', gap: 18, fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, color: 'var(--body-mid)' }}>
          {hasVisibleLikesCount(post.likes_count) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><HeartIcon /> {fmtLikes(post.likes_count)}</span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CommentIcon /> {post.comments_count.toLocaleString('en-GB')}</span>
        </div>
      </div>
    </div>
  );
}

/** The AI's "why it worked" line for a post, or null if it hasn't got one.
 *  post_insight is a structured blob ("What it is… Why it worked… Consider
 *  this…"); the band leads on the why, and accepts a short free-form note as
 *  the fallback. Anything else is treated as no insight at all. */
function whyItWorkedOf(post: OutlierPost): string | null {
  if (!post.post_insight) return null;
  const parsed = parseInsight(post.post_insight);
  return parsed?.whyItWorked ?? parsed?.freeform ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Landing({
  data,
  placesLeft,
}: {
  data: DashboardData;
  /** Live founding-seat count, or null when it could not be read. */
  placesLeft: number | null;
}) {
  const heroFoundingLine =
    placesLeft === null ? HERO_FOUNDING_LINE_NO_COUNT : foundingHeroLine(placesLeft);
  const rootRef = useRef<HTMLDivElement>(null);
  // Six distinct previewed posts: the first three fan out in the hero stack, the
  // next three fill the taster grid. Dedupe by post_id first (a collab shares one
  // post_id across handles) so the same post never shows twice across the page.
  // belowCap() first: this whole page is a shop window, so every card on it is a
  // headline figure. A post whose multiplier is too large to be credible is left
  // out entirely rather than shown as "50×+" to someone who hasn't bought yet.
  const seenPost = new Set<string>();
  const featured = belowCap(data.landing_featured).filter(p => {
    if (seenPost.has(p.post_id)) return false;
    seenPost.add(p.post_id);
    return true;
  });
  const hero = featured.slice(0, 3);
  // Prefer three fresh posts for the taster; only fall back to reusing the hero
  // set if there aren't six distinct posts to show (keeps the grid populated).
  const taster = featured.length >= 4 ? featured.slice(3, 6) : featured.slice(0, 3);

  // The one post the "inside a breakout" band opens up. The taster shows WHAT
  // won behind a gate; this shows one in full, with the AI's read of WHY —
  // which is the thing the product actually sells.
  //
  // ⚠ The pool is deliberately WIDER than landing_featured. Only 2 of the 9
  // homepage-pinned posts currently carry an insight, and the pinned set
  // ring-rotates hourly, so drawing solely from it would make this band blink
  // in and out of the homepage from one hour to the next. So: the curated posts
  // get first refusal, then the best of the last 30 days. Both are already
  // belowCap'd — this page is a shop window, and a multiplier too large to be
  // credible is left off it entirely rather than shown to someone who hasn't
  // bought yet.
  //
  // Requirements: a parseable "why it worked", and not a post already on the
  // page (the same image twice reads as a bug, not as emphasis). Still nothing
  // → the band is omitted rather than shown half-empty.
  const alreadyShown = new Set([...hero, ...taster].map(p => p.post_id));
  const seenCandidate = new Set<string>();
  const insideBreakout =
    [...featured, ...belowCap(data.standout['30d'] ?? [])].find(p => {
      if (alreadyShown.has(p.post_id) || seenCandidate.has(p.post_id)) return false;
      seenCandidate.add(p.post_id);
      return whyItWorkedOf(p) !== null;
    }) ?? null;

  // Reveal-on-scroll and count-ups — all scoped to this
  // subtree. Base markup is the visible end-state, so nothing is ever stranded.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observers: IntersectionObserver[] = [];
    let failsafe = 0;

    // Reveal-on-scroll. Elements ship hidden (opacity:0 via .cr-landing [data-reveal]
    // in globals.css) so nothing blinks out on load — we add .cr-in (which flips the
    // base back to visible) and animate the float-in via the Web Animations API.
    // WAAPI runs on the compositor and never triggers the cards' inline .16s transform
    // transition, so there's no settle/jump at the end. If motion is reduced or IO is
    // unavailable, just reveal everything immediately.
    const revealEls = root.querySelectorAll<HTMLElement>('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('cr-in'));
    } else if (revealEls.length) {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
          el.classList.add('cr-in'); // keeps it visible once the animation is released
          el.style.willChange = 'transform, opacity';
          const anim = el.animate(
            [
              { opacity: 0, transform: 'translate3d(0,24px,0)' },
              { opacity: 1, transform: 'translate3d(0,0,0)' },
            ],
            { duration: 800, delay, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'both' },
          );
          anim.onfinish = () => {
            anim.cancel();            // hand back to base CSS (now visible via .cr-in)
            el.style.willChange = ''; // release the layer so text renders crisp again
          };
          obs.unobserve(el);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach((el) => io.observe(el));
      observers.push(io);

      // Safety net: content ships hidden, so if the observer never fires (a broken or
      // zero-size viewport, or IO misbehaving) the page would be left blank. If nothing
      // has revealed shortly after load, reveal everything so content is never stranded.
      failsafe = window.setTimeout(() => {
        if (!root.querySelector('[data-reveal].cr-in')) {
          revealEls.forEach((el) => el.classList.add('cr-in'));
        }
      }, 1500);
    }

    // Count-ups on the taster multipliers
    const animCount = (el: HTMLElement) => {
      const to = parseFloat(el.getAttribute('data-count') || '0');
      const dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      const suf = el.getAttribute('data-suffix') || '';
      if (reduce) { el.textContent = to.toFixed(dec) + suf; return; }
      const dur = 1100, start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        el.textContent = ((1 - Math.pow(1 - t, 3)) * to).toFixed(dec) + suf;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver((es, obs) => {
        es.forEach((e) => { if (e.isIntersecting) { animCount(e.target as HTMLElement); obs.unobserve(e.target); } });
      }, { threshold: 0.5 });
      root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => cio.observe(el));
      observers.push(cio);
    }

    return () => {
      observers.forEach((o) => o.disconnect());
      if (failsafe) clearTimeout(failsafe);
    };
  }, []);

  return (
    <div ref={rootRef} className="cr-landing" style={{ background: 'var(--page)', color: 'var(--ink)', overflowX: 'hidden' }}>
      {/* No-JS failsafe: if scripts never run, reveal-on-scroll can't fire, so force
          every hidden element visible rather than stranding the whole page blank. */}
      <noscript><style>{`.cr-landing [data-reveal]{opacity:1!important}`}</style></noscript>
      {/* ===== NAV ===== */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)', background: 'rgba(231,227,217,0.82)', borderBottom: '1px solid var(--line-rule)' }}>
        <div style={{ ...INNER, padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="26" height="26" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="34" stroke="#22201B" strokeWidth="3" opacity="0.16" />
              <circle cx="36" cy="36" r="27" stroke="#22201B" strokeWidth="3" opacity="0.32" />
              <circle cx="36" cy="36" r="20" stroke="#22201B" strokeWidth="3" opacity="0.52" />
              <circle cx="36" cy="36" r="13" stroke="#22201B" strokeWidth="3" opacity="0.78" />
              <circle cx="36" cy="36" r="7" fill="#2E7357" />
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--ink)' }}>content radar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#pricing" style={{ ...eyebrow(), fontSize: 12, letterSpacing: '0.04em', textDecoration: 'none' }}>pricing</a>
            <Link href={LOGIN_HREF} style={{ ...eyebrow(), fontSize: 12, letterSpacing: '0.04em', textDecoration: 'none', whiteSpace: 'nowrap' }}>log in</Link>
            <Link href={TRIAL_HREF} className="cr-navcta" style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--surface)', background: 'var(--ink-deep)', padding: '11px 22px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap' }}>start free trial</Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header style={{ ...INNER, padding: '80px 40px 48px' }}>
        <div
          className="cr-landing-hero-grid"
          style={{ display: 'grid', gridTemplateColumns: hero.length > 0 ? 'minmax(0,1fr) minmax(340px,460px)' : '1fr', gap: 64, alignItems: 'center' }}
        >
          <div style={{ minWidth: 0 }}>
            <div data-reveal style={{ ...eyebrow(), marginBottom: 26 }}>Designed for social media teams at luxury hotels</div>
            <h1 data-reveal style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(38px,4.6vw,60px)', lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--ink)', textWrap: 'balance', marginBottom: 18 }}>
              Every week, see the content that&rsquo;s going viral for luxury hotels.
            </h1>
            <div data-reveal data-reveal-delay={60} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(19px,2.6vw,26px)', letterSpacing: '-0.02em', color: 'var(--signal-deep)', marginBottom: 22 }}>No more quiet content weeks.</div>
            <p data-reveal data-reveal-delay={120} style={{ fontSize: 'clamp(16px,1.8vw,19px)', lineHeight: 1.6, color: 'var(--body-soft)', maxWidth: 480, margin: '0 0 34px', textWrap: 'pretty' }}>
              We watch every post from 400+ of the world&rsquo;s best hotels. We then share and explain the best-performing content, all in one place. Not theory. Not trend decks. Just the best hotel content, ready to adapt — so your content calendar never sits empty again.
            </p>

            <div data-reveal data-reveal-delay={180} style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <Link href={TRIAL_HREF} className="cr-cta-primary" style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--surface)', background: 'var(--ink-deep)', padding: '16px 34px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
              <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.03em', color: 'var(--body-mid)' }}>{TRIAL_FINE_PRINT}</span>
            </div>

            {/* The ONE founding-membership touchpoint in the hero. Sentence case,
                not the uppercase eyebrow treatment — the scarcity is real, so it
                reads as a quiet statement of fact rather than a shout. */}
            <div data-reveal data-reveal-delay={240} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18, fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 13.5, letterSpacing: '0.01em', color: 'var(--signal-deep)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flex: 'none' }} />
              {heroFoundingLine}
            </div>
          </div>

          {hero.length > 0 && (
            <div data-reveal data-reveal-delay={140} className="cr-hero-cardstack" style={{ position: 'relative', minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {hero.length >= 3 && (
                <FanCard
                  post={hero[1]} index={1} front={false} rotateDeg={-5} animationDuration={7} animationDelay={0}
                  position={{ position: 'absolute', width: 'min(200px,62vw)', right: '58%', top: '10%', opacity: 0.92, zIndex: 1 }}
                />
              )}
              {hero.length >= 2 && (
                <FanCard
                  post={hero.length >= 3 ? hero[2] : hero[1]} index={2} front={false} rotateDeg={5} animationDuration={8} animationDelay={1.2}
                  position={{ position: 'absolute', width: 'min(200px,62vw)', left: '58%', bottom: '8%', opacity: 0.95, zIndex: 1 }}
                />
              )}
              <FanCard
                post={hero[0]} index={0} front rotateDeg={0} animationDuration={6} animationDelay={0.5}
                position={{ position: 'relative', zIndex: 2, width: 'min(256px,80vw)' }}
              />
            </div>
          )}
        </div>
      </header>

      {/* ===== THIS WEEK ON CONTENT RADAR (live stat band) ===== */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '4px 40px 72px' }}>
        <div data-reveal style={{ background: 'var(--top3-tint)', border: '1px solid var(--line-accent)', borderRadius: 20, padding: '44px 48px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, ...eyebrow() }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', animation: 'cr-ping 2.4s ease-out infinite' }} />
              This week on Content Radar
            </span>
          </div>
          <div style={{ borderTop: '1px solid var(--line-accent)', borderBottom: '1px solid var(--line-accent)', padding: '36px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            {[
              { v: String(data.breakout_count), l: 'breakouts this week', accent: true, border: false },
              { v: `${data.hotel_count}+`, l: 'hotels tracked', border: true },
              { v: String(data.countries_count), l: 'countries', border: true },
              { v: data.total_posts_analysed.toLocaleString('en-GB'), l: 'posts analysed', border: true },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: 'center', padding: '4px 16px', borderLeft: s.border ? '1px solid var(--line-accent)' : undefined }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(38px,4.4vw,56px)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: s.accent ? 'var(--signal)' : 'var(--ink)' }}>{s.v}</div>
                <div style={{ marginTop: 11, fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em', color: 'var(--body-soft)' }}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* ⚠ SOURCING CLAIM — every name here must be one we can stand behind.
              Each is verified per-hotel in lib/accreditations.generated.ts:
              Forbes Five-Star 319, Condé Nast Gold List 139, Michelin Keys 139
              (82 One / 43 Two / 14 Three), World's 50 Best 50.
              Relais & Châteaux was in the 2026-08-06 design and was dropped
              (Neil, same day): it appears on NO hotel in that map, and listing
              it here while "More lists adding soon" below also names it made
              the page contradict itself. Don't add a list to this row until it
              has hotels in the map. */}
          <div style={{ marginTop: 30, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--body-mid)' }}>
              Tracked from the lists that matter
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 }}>
              {['Forbes Five-Star', 'Condé Nast Gold List', "World's 50 Best Hotels", 'Michelin Keys'].map((t) => (
                <span key={t} style={listChip('light')}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHO IT'S FOR ===== */}
      <section style={{ ...INNER, padding: '20px 40px 84px' }}>
        <div data-reveal style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ ...eyebrow(), marginBottom: 22 }}>Who it&rsquo;s for</div>
          <h2 style={{ ...sectionTitle, lineHeight: 1.12, marginBottom: 44 }}>Built for your hotel&rsquo;s social media team.</h2>
        </div>

        {/* ===== LIVE TASTER (moved here) ===== */}
        {taster.length > 0 && (
          <div>
            <div data-reveal style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, ...eyebrow() }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', animation: 'cr-ping 2.4s ease-out infinite' }} />
                Latest viral posts — live with Content Radar
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
                {taster.map((p, i) => <OpenCard key={`${p.post_id}-${p.instagram_handle}`} post={p} index={i} />)}
              </div>

              {/* Bottom fade-gate — the conversion gate. Fades the lower portion of the
                  live cards into the page; only the CTA takes pointer events. */}
              <div
                data-reveal data-reveal-delay={240}
                style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'flex-end', textAlign: 'center', paddingBottom: 86,
                  background: 'linear-gradient(to bottom, rgba(231,227,217,0) 40%, rgba(231,227,217,0.92) 64%, var(--page) 80%)',
                  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 38%, #000 60%)',
                  maskImage: 'linear-gradient(to bottom, transparent 38%, #000 60%)',
                  pointerEvents: 'none',
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16 }}>
                  <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" stroke="var(--ink)" strokeWidth="1.6" />
                  <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'clamp(16px,2vw,19px)', color: 'var(--ink)', maxWidth: 460, lineHeight: 1.45, marginBottom: 22, textWrap: 'balance' }}>
                  Your free trial opens the full dashboard — this week&rsquo;s breakouts plus every post from the last 30 days.
                </p>
                <Link href={TRIAL_HREF} className="cr-cta-primary" style={{ pointerEvents: 'auto', display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--surface)', background: 'var(--ink-deep)', padding: '16px 34px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
              </div>
            </div>
          </div>
        )}
      </section>


      {/* ===== INSIDE A BREAKOUT (deep-green band) =====
          Rebuilt 2026-08-05 from the idea in the closed PR #68. It sits here,
          straight after the gated taster, because the taster shows WHAT won and
          hides the rest — this answers the question that creates, with one post
          opened all the way up. The original also carried an accolade strip
          re-adding Michelin Keys; that was NOT carried over (see the note on
          the credibility line above — we don't crawl that list).

          --signal-deep is deliberately the same green as "What you get" further
          down: they bookend the middle of the page. Two notes of green, which
          is the design system's limit, so don't add a third. */}
      {insideBreakout && (
        <section style={{ background: 'var(--signal-deep)', padding: '100px 40px' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto' }}>
            <div data-reveal style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
              <div style={{ ...eyebrow('var(--signal-light)'), marginBottom: 22 }}>Inside a breakout</div>
              <h2 style={{ ...sectionTitle, color: 'var(--surface)' }}>
                Not just what won — why it won.
              </h2>
              <p style={{ fontSize: 'clamp(15px,1.6vw,17px)', lineHeight: 1.6, color: 'rgba(247,246,242,0.72)', marginTop: 20, textWrap: 'balance' }}>
                The strongest breakouts are read and explained, so you get the thinking you can
                reuse — not just a post that did well.
              </p>
            </div>

            <div
              data-reveal data-reveal-delay={120}
              className="cr-inside-breakout"
              style={{ display: 'grid', gridTemplateColumns: 'minmax(0,340px) minmax(0,1fr)', gap: 48, alignItems: 'center' }}
            >
              {/* The post — a light tile on the green, same idiom as the taster
                  cards so it reads as the same object, opened up. */}
              <div style={{ background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 18px 44px rgba(0,0,0,0.24)' }}>
                <div style={{ aspectRatio: '4 / 5', background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
                  <ImageWithFallback
                    src={insideBreakout.image_url}
                    alt={insideBreakout.hotel_name}
                    fallback={TASTER_GRADIENTS[0]}
                    backdrop={false}
                  />
                  <span
                    style={{
                      position: 'absolute', top: 14, right: 14, fontFamily: 'var(--font-display)', fontWeight: 800,
                      fontSize: 20, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', color: 'var(--signal-deep)',
                      background: 'var(--surface)', padding: '6px 14px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {formatMultiplier(insideBreakout.multiplier)}
                  </span>
                </div>
                <div style={{ padding: '18px 20px 20px' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
                    {insideBreakout.hotel_name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em', color: 'var(--body-mid)', marginTop: 3 }}>
                    {[insideBreakout.hotel_country, fmtDayMonth(insideBreakout.posted_at)].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              {/* The read. */}
              <div>
                <div style={{ ...eyebrow('var(--signal-light)'), fontSize: 11, marginBottom: 14 }}>Why it worked</div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(18px,2.2vw,24px)', lineHeight: 1.5, letterSpacing: '-0.01em', color: 'var(--surface)', textWrap: 'balance' }}>
                  {whyItWorkedOf(insideBreakout)}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
                  {[typeLabel(insideBreakout.type), insideBreakout.theme_tag, insideBreakout.driver_tag]
                    .filter(Boolean)
                    .map(tag => (
                      <span
                        key={tag as string}
                        style={{
                          fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em',
                          textTransform: 'uppercase', color: 'var(--signal-light)',
                          border: '1px solid rgba(127,193,162,0.4)', borderRadius: 20, padding: '6px 13px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                </div>

                <div style={{ marginTop: 34 }}>
                  <Link
                    href={TRIAL_HREF}
                    className="cr-cta-primary"
                    style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--signal-deep)', background: 'var(--surface)', padding: '16px 34px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .2s, background .2s' }}
                  >
                    start your free trial <CtaArrow />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" style={{ ...INNER, padding: '100px 40px 68px' }}>
        <div data-reveal style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
          <div style={{ ...eyebrow(), marginBottom: 22 }}>How it works</div>
          <h2 style={{ ...sectionTitle, marginBottom: 20 }}>From the world&rsquo;s best hotels to your dashboard, every week.</h2>
          <p style={{ fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--body-soft)', textWrap: 'pretty' }}>Your entire week of content research, done in ten minutes a week. No spreadsheets. No scraping. No guesswork.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {[
            { n: '1', label: 'We scan', title: '400+ elite hotels, every week', body: 'Every week we scan the latest social media posts from the world’s most prestigious and most-followed luxury hotels.' },
            { n: '2', label: 'We share', title: 'Every post that’s worth looking at', body: 'Every breakout post — the ones that have gone viral, are going viral now, or simply struck a chord with the audience — surfaced for you to review.' },
            { n: '3', label: 'You create', title: 'New inspiration every week', body: 'Enjoy an exhaustive and continuously updating library of the industry’s best-performing content — ready to inspire your own hotel’s social media.' },
          ].map((s, i) => (
            <div key={s.n} data-reveal data-reveal-delay={i * 90} data-card style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '38px 32px 34px', position: 'relative', overflow: 'hidden', transition: 'transform .16s, box-shadow .16s' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 22 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--surface)', width: 46, height: 46, borderRadius: '50%', background: 'var(--signal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 8px 18px -7px rgba(46,115,87,0.65)' }}>{s.n}</span>
                <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--signal-deep)', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              <h3 style={{ position: 'relative', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ position: 'relative', fontSize: 15, lineHeight: 1.55, color: 'var(--body-soft)' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ===== WHY BELIEVE IT (dark band) ===== */}
      <section style={{ background: 'var(--ink-deep)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '100px 40px' }}>
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 64, alignItems: 'start' }}>
            <div>
              <div style={{ ...eyebrow('var(--signal-light)'), marginBottom: 26 }}>Why believe it</div>
              <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--surface)', textWrap: 'balance', margin: 0 }}>
                The best hotels, the best ideas, the best results.
              </h2>
            </div>
            <div style={{ maxWidth: 520 }}>
              <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--on-dark-soft)', marginBottom: 14 }}>Only the world&rsquo;s best</div>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--on-dark-soft)', margin: 0 }}>
                This isn&rsquo;t a random Instagram scrape. Content Radar tracks hotels already certified as the best in the world — the <b style={{ color: 'var(--page)', fontWeight: 600 }}>Condé Nast Gold List</b>, <b style={{ color: 'var(--page)', fontWeight: 600 }}>Forbes Five-Star</b> and <b style={{ color: 'var(--page)', fontWeight: 600 }}>The World&rsquo;s 50 Best Hotels</b>. Not one is an account we picked at random.
              </p>
              {/* "Measured fairly" used to sit here. It moved into the "Real
                  winners, measured fairly" card below, where the disclosure has
                  room to explain the baseline properly. */}
              <div style={{ borderTop: '1px solid var(--line-dark)', marginTop: 32, paddingTop: 32 }}>
                <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--on-dark-soft)', marginBottom: 14 }}>More lists adding soon</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Small Luxury Hotels of the World', 'Design Hotels', 'Leading Hotels of the World', 'Relais & Châteaux'].map((t) => (
                    <span key={t} style={listChip('ink')}>{t}</span>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: ON_DARK_FINEPRINT, margin: '32px 0 0' }}>
                Content Radar is independent and is not affiliated with, endorsed by, or sponsored by these publications. All figures are drawn from public Instagram data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT YOU GET (dark green band) ===== */}
      <section style={{ background: 'var(--signal-deep)', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div data-reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 56px' }}>
            <div style={{ ...eyebrow('var(--signal-light)'), marginBottom: 22 }}>What you get</div>
            <h2 style={{ ...sectionTitle, color: 'var(--surface)', margin: 0 }}>Everything you need to never face a blank calendar again.</h2>
          </div>
          {/* Each card leads on the outcome and hides the mechanism behind a
              "What this means" disclosure — the detail is what convinces, but
              six paragraphs of it up front is a wall. */}
          <div className="cr-whatyouget-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
            {[
              { n: '1', label: 'This week', title: 'You never start from a blank page', body: 'Each week, a fresh feed of five-star hotel posts that genuinely broke out — proven ideas waiting before you’ve even opened Instagram. No staring at an empty calendar wondering what to make. And because it refreshes every week, it never runs dry: this is a living feed, not a library you read once.' },
              { n: '2', label: 'The mechanic', title: 'Real winners, measured fairly', body: 'A post with lots of likes isn’t automatically a good post — a big account gets lots of likes on everything. So we don’t rank by raw numbers. We work out what’s normal for each individual hotel, then surface only the posts that beat their own normal by at least two times. That means a 30-room boutique’s brilliant post can outrank a global brand’s ordinary one.' },
              { n: '3', label: 'Time back', title: 'We do the scrolling, you do the creating', body: 'Checking what everyone else is posting is real work, and it eats your week. We watch a curated universe of 400+ five-star hotels so you don’t have to — then hand you only the posts that actually performed. The signal, without the two-hour scroll.' },
              { n: '4', label: 'The benchmark', title: 'Know exactly where you stand', body: 'It’s hard to judge your own work in isolation. Our leaderboards rank the top posts and hotels over the last 30 days and over all time, so you can see who’s consistently winning — and exactly where you sit against the wider five-star field. Two honest measures sit underneath: engagement rate (how hard a post punched for its audience size) and breakout (whether it was unusual for that hotel).' },
              { n: '5', label: 'The edge', title: 'See the trend before your rivals', body: 'When the same kind of post starts breaking out across lots of hotels at once, that’s a trend forming — and we surface it early. We also read the patterns underneath: which days and times tend to land, how often the top performers post, and the principle behind a winning post so you can adapt it for your own property.' },
              { n: '6', label: 'Peace of mind', title: 'Post with proof — and prove it upstairs', body: 'Post from proof, not a hunch — everything we show you has already worked for a comparable hotel, so you spend less time worrying about a flop and more time creating. And when your GM asks why you posted it, you have an answer backed by data across 400+ five-star hotels, not just a gut feeling.' },
            ].map((c, i) => (
              <div key={c.n} data-reveal data-reveal-delay={(i % 2) * 90} data-card style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '30px 32px', transition: 'transform .16s, box-shadow .16s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--surface)', width: 46, height: 46, borderRadius: '50%', background: 'var(--signal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 8px 18px -7px rgba(46,115,87,0.65)' }}>{c.n}</span>
                  <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--signal-deep)', whiteSpace: 'nowrap' }}>{c.label}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, lineHeight: 1.25, color: 'var(--ink)', margin: 0, textWrap: 'balance' }}>{c.title}</h3>
                <WhatThisMeans>{c.body}</WhatThisMeans>
              </div>
            ))}
          </div>

          {/* TikTok/YouTube used to be card 4. It's a promise, not a thing you
              get today, so it now sits under the grid as a one-line note. */}
          <div data-reveal style={{ textAlign: 'center', marginTop: 34, fontSize: 13.5, color: ON_DARK_FINEPRINT }}>
            Coming next — TikTok and YouTube tracking, September 2026.
          </div>

          {/* ⚠ Same rule as the credibility strip: verified lists only. Design
              Hotels was in the 2026-08-06 design and was dropped (Neil, same
              day) — it appears on no hotel in lib/accreditations.generated.ts
              and "More lists adding soon" already names it as not yet in. */}
          <div data-reveal style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid rgba(247,246,242,0.14)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: ON_DARK_FINEPRINT }}>
              A curated universe of the names that carry weight
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {['Forbes Five-Star', 'Condé Nast Gold List', 'Michelin Keys'].map((t) => (
                <span key={t} style={listChip('green')}>{t}</span>
              ))}
            </div>
            <p style={{ maxWidth: 620, margin: '22px auto 0', fontSize: 12.5, lineHeight: 1.6, color: ON_DARK_FINEPRINT, textWrap: 'pretty' }}>
              Hotel Content Radar is independent and is not affiliated with, endorsed by, or connected to Forbes, Condé Nast, Michelin, Instagram, or any listed rating body or collection.
            </p>
            <p style={{ maxWidth: 620, margin: '14px auto 0', fontSize: 12.5, lineHeight: 1.6, color: ON_DARK_FINEPRINT, textWrap: 'pretty' }}>
              Public data only — likes and comments, never reach, impressions, saves or shares. We&rsquo;d rather be straight about the edges than pretend we see everything.
            </p>
          </div>
        </div>
      </section>

      {/* ===== PRICING =====
          One block, one product. The section sits on --surface so it reads as a
          distinct band between the dark-green "what you get" band above and the
          page-coloured FAQ below — no new colours, just existing tokens. */}
      <section id="pricing" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ ...INNER, padding: '100px 40px 88px' }}>
          {/* Value stack — what the founding price replaces. Sits on --page so it
              still reads as a card against the --surface band. */}
          <div data-reveal style={{ maxWidth: 560, margin: '0 auto 18px', background: 'var(--page)', border: '1px solid var(--line)', borderRadius: 20, padding: '32px 36px' }}>
            <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--signal-deep)', marginBottom: 18 }}>What your {FOUNDING_PRICE_DISPLAY} replaces</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {VALUE_STACK.map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, fontSize: 15, color: 'var(--body-strong)' }}>
                  <span>{r.label}</span>
                  <span style={{ color: 'var(--muted)', textDecoration: 'line-through', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{monthlyCost(r.monthlyGbp)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, paddingTop: 15, borderTop: '1px solid var(--line-rule)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
              <span>Total value</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{monthlyCost(VALUE_STACK_TOTAL_GBP)}</span>
            </div>
            {/* These are illustrative agency/tool costs, not prices anyone is
                charged — lib/pricing.ts says so in a comment, but the page
                didn't, and struck-through figures read as real quotes. */}
            <div style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.5, color: 'var(--body-mid)' }}>
              Illustrative agency and tool costs, for comparison — not prices we charge.
            </div>
          </div>

          <div data-reveal data-reveal-delay={40} style={{ textAlign: 'center', marginBottom: 18, fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--body-mid)' }}>All of it, for</div>

          <div data-reveal data-reveal-delay={80} style={{ maxWidth: 560, margin: '0 auto', background: 'var(--ink-deep)', borderRadius: 20, padding: '44px 48px 48px', textAlign: 'center', boxShadow: '0 40px 80px -50px rgba(34,32,27,0.7)' }}>
            <div style={{ ...eyebrow('var(--signal-light)'), marginBottom: 22 }}>Founding membership</div>

            {/* Standard price, de-emphasised, above the one that matters. */}
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 20, color: 'var(--on-dark-soft)', textDecoration: 'line-through', marginBottom: 6 }}>{STANDARD_PRICE_MONTHLY}</div>

            {/* The founding price — the largest single piece of type in the section. */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 84, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--surface)' }}>{FOUNDING_PRICE_DISPLAY}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 20, color: 'var(--on-dark-soft)' }}>/month</span>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 18, color: 'var(--surface)', marginTop: 4 }}>locked for life</div>

            {/* Live information, not decoration — hence the signal colour. Omitted
                entirely rather than guessed when the seat count can't be read. */}
            {placesLeft !== null && (
              <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--signal-light)', marginTop: 18 }}>{placesLeftLine(placesLeft)}</div>
            )}

            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--page)', textAlign: 'left', margin: '30px 0 0' }}>
              Every week, Content Radar shows you the posts that broke out across the world&rsquo;s best hotels — and why they worked. Founding members pay {FOUNDING_PRICE_MONTHLY.replace('/month', ' a month')} for as long as they stay a member, even after the price goes to {STANDARD_PRICE_DISPLAY}.
            </p>

            {/* The "what I want in return: your feedback" panel was dropped in
                the 2026-08-06 design — it asked for something at the exact
                moment the page should only be offering. Spacer keeps the
                rhythm between the paragraph and the CTA. */}
            <div style={{ height: 30 }} />

            <Link href={TRIAL_HREF} className="cr-cta-light" style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 17, color: 'var(--ink-deep)', background: 'var(--surface)', padding: 17, borderRadius: 12, textDecoration: 'none', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--body-mid)', marginTop: 18 }}>{TRIAL_FINE_PRINT}</p>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={{ maxWidth: 820, margin: '0 auto', padding: '56px 40px 100px' }}>
        <div data-reveal style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ ...eyebrow(), marginBottom: 20 }}>Before you ask</div>
          <h2 style={sectionTitle}>The usual questions.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { q: 'Is it just Instagram?', a: 'For now, yes — it’s where hotel content travels furthest. TikTok and YouTube are coming September 2026, and founding members lock in this Instagram rate for good.' },
            { q: 'What if my hotel is small?', a: 'It doesn’t matter. Every breakout is measured against that hotel’s own baseline, so a boutique’s win shows up right next to a global flagship’s. You’re copying ideas, not budgets.' },
            { q: 'How many hotels are you tracking?', a: '400+ today, with more hotels and more ranking lists added every week. We’re building toward 1,000+ of the world’s most prestigious and most-followed hotels — so the list only gets better the longer you’re a member.' },
            { q: 'Where does the data come from?', a: 'Hotels already certified as the best in the world — the Condé Nast Gold List, Forbes Five-Star and The World’s 50 Best Hotels, with more respected lists added as we verify them. Never a random scrape.' },
            { q: 'Can I cancel anytime?', a: `Yes. Start with a ${TRIAL_DAYS}-day free trial, and cancel whenever you like — when you cancel, the next payment simply won’t happen. No lock-in, no awkward emails.` },
          ].map((f, i, arr) => (
            <div key={f.q} data-reveal style={{ padding: '26px 0', borderTop: '1px solid var(--line-rule)', borderBottom: i === arr.length - 1 ? '1px solid var(--line-rule)' : undefined }}>
              <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 19, color: 'var(--ink)', marginBottom: 10 }}>{f.q}</h3>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--body-soft)' }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CLOSING CTA (dark band) ===== */}
      <section style={{ background: 'var(--ink-deep)', borderTop: '1px solid var(--line-dark)' }}>
        <div style={{ ...INNER, padding: '100px 40px', textAlign: 'center' }}>
          <h2 data-reveal style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(30px,5vw,54px)', lineHeight: 1.08, letterSpacing: '-0.03em', color: 'var(--surface)', marginBottom: 36, textWrap: 'balance' }}>See this week&rsquo;s best-performing<br />posts before you pay a penny.</h2>
          <div data-reveal data-reveal-delay={120}>
            <Link href={TRIAL_HREF} className="cr-cta-light" style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 17, color: 'var(--ink-deep)', background: 'var(--surface)', padding: '18px 44px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
            <div style={{ maxWidth: 440, margin: '16px auto 0', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 15, lineHeight: 1.5, color: 'var(--on-dark-soft)' }}>Start your free trial and open the full dashboard — this week&rsquo;s breakouts and every post from the last 30 days. We ask for a card, but nothing is charged for 14 days. If it doesn&rsquo;t fill your calendar, cancel in two clicks.</div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: 'var(--ink-deep)' }}>
        <div style={{ ...INNER, padding: '64px 40px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 40, alignItems: 'start' }}>
            <div style={{ maxWidth: 300 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--surface)', marginBottom: 8 }}>content radar</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 15, lineHeight: 1.5, color: 'var(--signal-light)', marginBottom: 18 }}>Viral hotel content, in your pocket.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="11" height="18" viewBox="0 0 60 100" fill="none"><path d="M30,4 Q42,9 50,20 Q58,32 59,47 Q60,62 55,74 Q48,86 30,93 Q12,86 5,74 Q0,62 1,47 Q2,32 10,20 Q18,9 30,4Z" fill="#2E7357" opacity="0.85" /></svg>
                <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-dark)' }}>A High Elm Studio product</span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.6, color: 'var(--muted-dark)', marginTop: 14 }}>High Elm Studio is a luxury brand agency working at the edge of smart technology — building intelligent tools for the world&rsquo;s most prestigious hospitality names.</div>
            </div>
            {[
              { head: 'Product', links: [{ t: 'How it works', h: '#how-it-works' }, { t: 'Pricing', h: '#pricing' }, { t: 'FAQ', h: '#faq' }, { t: 'Start free trial', h: TRIAL_HREF, accent: true }] },
              { head: 'Company', links: [{ t: 'High Elm Studio', h: 'https://highelmstudio.com' }, { t: 'Contact', h: 'mailto:neil@highelmstudio.com' }] },
              { head: 'Legal', links: [{ t: 'Privacy Policy', h: '/privacy' }, { t: 'Terms of Service', h: '/terms' }] },
            ].map((col) => (
              <div key={col.head}>
                <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-dark)', marginBottom: 18 }}>{col.head}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {col.links.map((l) => (
                    <a key={l.t} href={l.h} className="cr-footlink" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: l.accent ? 'var(--signal-light)' : 'var(--on-dark-soft)', textDecoration: 'none', transition: 'color .2s' }}>{l.t}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--line-dark)', margin: '44px 0 24px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.03em', color: 'var(--muted-dark)', lineHeight: 1.7 }}>© 2026 High Elm Productions Ltd · Company #15336186 · England &amp; Wales · ICO ZC112391</div>
            <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.03em', color: 'var(--muted-dark)' }}>All figures from public Instagram data.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { DashboardData, OutlierPost } from '@/lib/data';
import { ImageWithFallback } from './ContentRadar';

// ─── Offer (single source of truth for every CTA + the pricing card) ─────────
// All trial CTAs point at the placeholder route until Stripe Checkout exists.
// Swap TRIAL_HREF when the real checkout URL is ready.
const TRIAL_HREF = '/start-trial';
const LOGIN_HREF = '/login';

const FOUNDING_PRICE = 39;   // £/month, founding rate
const TRIAL_DAYS = 14;       // free-trial length
const FOUNDING_CLAIMED = 11; // of FOUNDING_CAP
const FOUNDING_CAP = 50;

const spotsLeft = FOUNDING_CAP - FOUNDING_CLAIMED;
const claimedPct = `${Math.round((FOUNDING_CLAIMED / FOUNDING_CAP) * 100)}%`;
const CTA_SUB = `£${FOUNDING_PRICE}/month after ${TRIAL_DAYS} days · cancel anytime`;

// Per-list "last scan" figures. Not broken out in getPortfolioData yet, so these
// stay as design-system sample values until the pipeline surfaces them per list.
const CERTS = [
  {
    name: 'Condé Nast', tag: 'Gold List',
    blurb: "Condé Nast Traveller's annual list of the finest hotels on Earth, voted by its readers.",
    hotels: 118, posts: '3,540',
  },
  {
    name: 'Forbes', tag: 'Five-Star',
    blurb: "Forbes Travel Guide's highest independent hospitality rating, awarded after anonymous inspection.",
    hotels: 264, posts: '7,920',
  },
  {
    name: 'Michelin', tag: 'Keys — UK & Ireland',
    blurb: "The Michelin Guide's hotel distinction — One, Two & Three Keys — for the UK & Ireland's most exceptional stays.",
    hotels: 96, posts: '2,880',
  },
];

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

// ─── Small inline SVGs (from the handoff; no external assets) ─────────────────
const StarIcon = ({ delay }: { delay: number }) => (
  <svg data-star viewBox="0 0 24 24" width="26" height="26" fill="currentColor" style={{ animationDelay: `${delay}ms` }}>
    <path d="M12 2.6l2.85 6.02 6.55.86-4.78 4.5 1.2 6.52L12 18.9l-5.82 2.6 1.2-6.52-4.78-4.5 6.55-.86z" />
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

function CtaArrow() {
  return <span className="cr-cta-arrow">→</span>;
}

// ─── Hero cluster tile: a complete, non-cropped breakout card (live proof) ───
// Replaces the old fanned/floating FanCard stack. Every card is a whole tile —
// image + multiplier badge + hotel + country·date — so the cluster reads as a
// tidy, balanced set rather than half-cut cards bleeding off the edge. `size`
// controls the lead tile (lg) vs the two supporting tiles (sm).
function MiniBreakoutCard({ post, index, size = 'sm' }: { post: OutlierPost; index: number; size?: 'lg' | 'sm' }) {
  const gradient = TASTER_GRADIENTS[index % TASTER_GRADIENTS.length];
  const chip = post.theme_tag ? `${typeLabel(post.type)} · ${post.theme_tag}` : typeLabel(post.type);
  const mult = post.multiplier.toFixed(1);
  const lg = size === 'lg';

  return (
    <div
      data-card
      style={{
        background: 'var(--surface)', border: '1px solid var(--line-rule)', borderRadius: 14,
        overflow: 'hidden', boxShadow: '0 20px 44px -30px rgba(34,32,27,0.55)',
      }}
    >
      <div style={{ aspectRatio: '4 / 5', background: gradient, position: 'relative', overflow: 'hidden' }}>
        <ImageWithFallback src={post.image_url} alt={post.hotel_name} fallback={gradient} backdrop={false} />
        <span style={{
          position: 'absolute', top: lg ? 14 : 11, left: lg ? 14 : 11, fontFamily: 'var(--font-label)', fontWeight: 600,
          fontSize: lg ? 10 : 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)',
          background: 'rgba(29,27,23,0.34)', backdropFilter: 'blur(4px)', padding: lg ? '5px 10px' : '4px 8px', borderRadius: 20,
        }}>{chip}</span>
        <span
          data-count={mult} data-dec="1" data-suffix="×"
          style={{
            position: 'absolute', top: lg ? 14 : 11, right: lg ? 14 : 11, fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: lg ? 18 : 14, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', color: 'var(--signal-deep)',
            background: 'var(--surface)', padding: lg ? '5px 12px' : '4px 9px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >{mult}×</span>
      </div>
      <div style={{ padding: lg ? '16px 18px' : '12px 14px' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: lg ? 16 : 14, color: 'var(--ink)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.hotel_name}</div>
        <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: lg ? 11 : 10, letterSpacing: '0.04em', color: 'var(--body-mid)', marginTop: 3 }}>
          {[post.hotel_country, fmtDayMonth(post.posted_at)].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
}

// ─── Featured breakout (lower view): one real breakout + the editor's read ────
// Auto-selected upstream as the highest-ranked landing_featured post that has a
// written insight (graceful fallback: the top breakout with the read hidden).
// Sits on the deep-green feature band, but the card itself stays a light cream
// tile so the photo stays bright and the multiplier is the loudest element on
// screen. The multiplier + "Editor's note" + tags mirror the dashboard's
// BreakoutCard rendering (components/ContentRadar.tsx) rather than reinventing it.
function FeaturedBreakout({ post: p }: { post: OutlierPost }) {
  const meta = [p.hotel_country, fmtDayMonth(p.posted_at)].filter(Boolean).join(' · ');
  const tags = [p.driver_tag, p.theme_tag].filter(Boolean) as string[];
  const hasRead = !!(p.post_insight && p.post_insight.trim());

  return (
    <div
      className="cr-card-grid"
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18,
        overflow: 'hidden', boxShadow: '0 48px 90px -56px rgba(0,0,0,0.65)',
        display: 'grid', gridTemplateColumns: 'minmax(0,0.92fr) minmax(0,1.08fr)',
      }}
    >
      {/* Media */}
      <div className="cr-card-media" style={{ position: 'relative', minHeight: 420, background: 'var(--surface)' }}>
        <ImageWithFallback src={p.image_url} alt={p.hotel_name} fallback={TASTER_GRADIENTS[0]} backdrop={false} />
        <span style={{
          position: 'absolute', top: 16, left: 16, fontFamily: 'var(--font-label)', fontWeight: 600,
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)',
          background: 'rgba(29,27,23,0.34)', backdropFilter: 'blur(4px)', padding: '5px 10px', borderRadius: 20,
        }}>{typeLabel(p.type)}</span>
      </div>

      {/* Body */}
      <div className="cr-card-body" style={{ padding: '40px 44px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        {/* Multiplier — the loudest thing on screen */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <span
            data-count={p.multiplier.toFixed(1)} data-dec="1" data-suffix="×"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(54px,7vw,76px)', lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--signal-deep)' }}
          >{p.multiplier.toFixed(1)}×</span>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', lineHeight: 1.5, paddingBottom: 8 }}>vs hotel<br />median</span>
        </div>

        {/* Hotel */}
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', lineHeight: 1.25 }}>{p.hotel_name}</div>
          {meta && <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em', color: 'var(--body-mid)', marginTop: 6 }}>{meta}</div>}
        </div>

        {/* Editor's read — reuses the dashboard's "Editor's note" callout */}
        {hasRead && (
          <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--signal-deep)', marginBottom: 7 }}>Editor&rsquo;s note</div>
            <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{p.post_insight}</p>
          </div>
        )}

        {/* Driver / theme tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t) => (
              <span key={t} style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--signal-deep)', background: 'var(--top3-tint)', border: '1px solid #BFD8CC', borderRadius: 999, padding: '5px 12px' }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Landing({ data }: { data: DashboardData }) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Top view = liveness + scale: the top 1-3 breakouts as a tidy card cluster.
  const open = data.landing_featured.slice(0, 3);
  // Lower view = depth: ONE featured breakout, chosen at request time as the
  // highest-ranked landing_featured post that carries a written editor's read
  // (landing_featured is already sorted by multiplier, so .find gives the best
  // one with an insight). Graceful fallback to the top breakout — the read
  // module then hides itself rather than showing an empty box.
  const featured =
    data.landing_featured.find((p) => p.post_insight && p.post_insight.trim()) ??
    data.landing_featured[0] ??
    null;

  // Reveal-on-scroll, count-ups, and the founding-spots bar — all scoped to this
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

      // Founding-spots bar grows into view
      const bar = root.querySelector<HTMLElement>('[data-progress]');
      if (bar) {
        bar.style.transition = 'width 1.1s cubic-bezier(.2,.7,.2,1)';
        const target = bar.style.width || claimedPct;
        if (!reduce) bar.style.width = '0%';
        const bio = new IntersectionObserver((es, obs) => {
          es.forEach((e) => { if (e.isIntersecting) { bar.style.width = target; obs.unobserve(e.target); } });
        }, { threshold: 0.6 });
        bio.observe(bar);
        observers.push(bio);
      }
    }

    // Hero stat count-up (static value is the fallback)
    const statEl = root.querySelector<HTMLElement>('[data-stat]');
    if (statEl) {
      const target = data.breakout_count;
      if (reduce) {
        statEl.textContent = String(target);
      } else if ('IntersectionObserver' in window) {
        const sio = new IntersectionObserver((es, obs) => {
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            const dur = 1200, start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / dur);
              statEl.textContent = String(Math.round((1 - Math.pow(1 - t, 3)) * target));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            obs.unobserve(e.target);
          });
        }, { threshold: 0.5 });
        sio.observe(statEl);
        observers.push(sio);
      }
    }

    return () => {
      observers.forEach((o) => o.disconnect());
      if (failsafe) clearTimeout(failsafe);
    };
  }, [data.breakout_count]);

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
          style={{ display: 'grid', gridTemplateColumns: open.length > 0 ? 'minmax(0,1fr) minmax(340px,460px)' : '1fr', gap: 64, alignItems: 'center' }}
        >
          <div style={{ minWidth: 0 }}>
            <div data-reveal style={{ ...eyebrow(), marginBottom: 26 }}>Powered by High Elm Studio</div>
            <h1 data-reveal style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(38px,4.6vw,60px)', lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--ink)', textWrap: 'balance', marginBottom: 18 }}>
              Every week, see exactly what content is going viral for luxury hotels.
            </h1>
            <div data-reveal data-reveal-delay={60} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(19px,2.6vw,26px)', letterSpacing: '-0.02em', color: 'var(--signal-deep)', marginBottom: 22 }}>No more guessing.</div>
            <p data-reveal data-reveal-delay={120} style={{ fontSize: 'clamp(16px,1.8vw,19px)', lineHeight: 1.6, color: 'var(--body-soft)', maxWidth: 480, margin: '0 0 34px', textWrap: 'pretty' }}>
              400+ of the world&rsquo;s best luxury hotels every week. Not theory. Not guesswork. Not strategy. Just the content that has performed best in your industry.
            </p>

            <div data-reveal data-reveal-delay={180} style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <Link href={TRIAL_HREF} className="cr-cta-primary" style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--surface)', background: 'var(--ink-deep)', padding: '16px 34px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
              <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.03em', color: 'var(--body-mid)' }}>{CTA_SUB}</span>
            </div>

            <div data-reveal data-reveal-delay={220} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 40, fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--signal-deep)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', animation: 'cr-ping 2.4s ease-out infinite', flex: 'none' }} />
              This week&rsquo;s breakouts — live right now
            </div>
          </div>

          {open.length > 0 && (
            <div
              data-reveal data-reveal-delay={140} className="cr-hero-cardstack"
              style={{ display: 'grid', gridTemplateColumns: open.length === 1 ? '1fr' : '1fr 1fr', gap: 14, alignContent: 'center' }}
            >
              {open.length >= 3 ? (
                <>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <MiniBreakoutCard post={open[0]} index={0} size="lg" />
                  </div>
                  <MiniBreakoutCard post={open[1]} index={1} size="sm" />
                  <MiniBreakoutCard post={open[2]} index={2} size="sm" />
                </>
              ) : (
                open.map((p, i) => (
                  <MiniBreakoutCard key={`${p.post_id}-${p.instagram_handle}`} post={p} index={i} size={open.length === 1 ? 'lg' : 'sm'} />
                ))
              )}
            </div>
          )}
        </div>
      </header>

      {/* ===== PROOF (5-star credibility + live breakout count) ===== */}
      <section style={{ ...INNER, padding: '0 40px 48px' }}>
        <div style={{ maxWidth: 840 }}>
          <div data-reveal style={{ display: 'flex', alignItems: 'center', gap: 15, margin: '0 0 30px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 5, color: 'var(--signal)' }}>
              {[0, 70, 140, 210, 280].map((d) => <StarIcon key={d} delay={d} />)}
            </div>
            <span style={{ ...eyebrow() }}>Only the world&rsquo;s genuine 5-star hotels</span>
          </div>

          {/* Curated-from accolade strip — text only (no logos/marks): naming the
              three curation sources. The independence disclaimer in the "Why
              believe it" band below is the legal cover for naming them. */}
          <div data-reveal data-reveal-delay={30} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 30px' }}>
            <span style={{ ...eyebrow('var(--body-mid)') }}>Curated from</span>
            {['Forbes Five-Star', 'Condé Nast Gold List', 'Michelin Keys'].map((name) => (
              <span
                key={name}
                style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--body-soft)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '6px 14px', whiteSpace: 'nowrap' }}
              >
                {name}
              </span>
            ))}
          </div>

          {/* Hero stat panel — live breakout count */}
          <div data-reveal data-reveal-delay={60} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '34px 40px', maxWidth: 560, boxShadow: '0 24px 48px -32px rgba(34,32,27,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <span data-stat style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(56px,8vw,84px)', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--signal)' }}>{data.breakout_count}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 19, color: 'var(--ink)', lineHeight: 1.2 }}>posts beat their hotel&rsquo;s<br />own average this week</div>
                <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--body-mid)', marginTop: 8 }}>week ending {data.week_ending}</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--line-rule)', margin: '26px 0 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap', fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.03em', color: 'var(--body-soft)' }}>
              <span><b style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)' }}>{data.hotel_count}+</b> hotels</span>
              <span style={{ color: 'rgba(34,32,27,0.25)' }}>·</span>
              <span><b style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)' }}>{data.countries_count}</b> countries</span>
              <span style={{ color: 'rgba(34,32,27,0.25)' }}>·</span>
              <span><b style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)' }}>{data.total_posts_analysed.toLocaleString('en-GB')}</b> posts analysed</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHO IT'S FOR ===== */}
      <section style={{ ...INNER, padding: '20px 40px 56px' }}>
        <div data-reveal style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ ...eyebrow(), marginBottom: 22 }}>Who it&rsquo;s for</div>
          <h2 style={{ ...sectionTitle, lineHeight: 1.12, marginBottom: 0 }}>Built for your hotel&rsquo;s social media team.</h2>
        </div>
      </section>

      {/* ===== INSIDE A BREAKOUT — one featured breakout + the editor's read =====
          Deep-green feature band (#1B4A37 = --signal-deep, the palette's racing
          green; used as a literal so it never flips under a dark-mode token). The
          featured card stays a light cream tile; light text sits on the green. */}
      {featured && (
        <section style={{ background: '#1B4A37' }}>
          <div style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 40px' }}>
            <div data-reveal style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
              <div style={{ ...eyebrow('var(--signal-light)'), marginBottom: 20 }}>Inside a breakout</div>
              <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: 'var(--surface)', textWrap: 'balance' }}>
                Not just what won &mdash; why it won.
              </h2>
            </div>

            <div data-reveal data-reveal-delay={80} style={{ maxWidth: 960, margin: '0 auto' }}>
              <FeaturedBreakout post={featured} />
            </div>

            {/* Existing CTA — copy unchanged */}
            <div data-reveal data-reveal-delay={140} style={{ textAlign: 'center', marginTop: 48 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'clamp(16px,2vw,19px)', color: 'var(--surface)', maxWidth: 460, margin: '0 auto 22px', lineHeight: 1.45, textWrap: 'balance' }}>
                See every breakout this week — plus the last 30 days and the all-time leaderboard.
              </p>
              <Link href={TRIAL_HREF} className="cr-cta-light" style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--ink-deep)', background: 'var(--surface)', padding: '15px 34px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
            </div>
          </div>
        </section>
      )}


      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" style={{ ...INNER, padding: '100px 40px 68px' }}>
        <div data-reveal style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
          <div style={{ ...eyebrow(), marginBottom: 22 }}>How it works</div>
          <h2 style={{ ...sectionTitle, marginBottom: 20 }}>From the world&rsquo;s best hotels to your dashboard, every Monday.</h2>
          <p style={{ fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.6, color: 'var(--body-soft)', textWrap: 'pretty' }}>No spreadsheets. No scraping. No guesswork. Three steps, every single week. New hotels being added, new features coming.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {[
            { n: '1', label: 'We scan', title: '400+ elite hotels, every week', body: 'Every week we scan the latest social media posts from the world’s most prestigious and most-followed luxury hotels.' },
            { n: '2', label: 'We share', title: 'Every post that’s worth looking at', body: 'Every breakout post — the ones that have gone viral, are going viral now, or simply struck a chord with the audience — surfaced for you to review.' },
            { n: '3', label: 'You create', title: 'New inspiration every week', body: 'Enjoy an exhaustive and continuously updating library of the industry’s best-performing content — ready to inspire your own hotel’s social media.' },
          ].map((s, i) => (
            <div key={s.n} data-reveal data-reveal-delay={i * 90} data-card style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '36px 32px', transition: 'transform .16s, box-shadow .16s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ink)', width: 44, height: 44, borderRadius: '50%', border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--body-mid)', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--body-soft)' }}>{s.body}</p>
            </div>
          ))}
        </div>
        <div data-reveal data-reveal-delay={120} style={{ marginTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--body-mid)', marginRight: 4, whiteSpace: 'nowrap' }}>Browse three ways</span>
          {[
            { b: 'Last 7 days', t: 'this week’s breakouts' },
            { b: 'Last 30 days', t: 'the month' },
            { b: 'All time', t: 'the leaderboard' },
          ].map((p) => (
            <span key={p.b} style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--body-soft)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '8px 16px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <b style={{ color: 'var(--ink)' }}>{p.b}</b> · {p.t}
            </span>
          ))}
        </div>
      </section>


      {/* ===== WHY BELIEVE IT (dark band) ===== */}
      <section style={{ background: 'var(--ink-deep)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '100px 40px' }}>
          <div data-reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 64, alignItems: 'start' }}>
            <div>
              <div style={{ ...eyebrow('var(--signal-light)'), marginBottom: 26 }}>Why believe it</div>
              <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--surface)', textWrap: 'balance' }}>
                Certified among the best, compared against their own baseline.
              </h2>
            </div>
            <div style={{ maxWidth: 520 }}>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--on-dark-soft)', marginBottom: 22 }}>
                This isn&rsquo;t a random Instagram scrape. Content Radar only tracks hotels already certified as the best in the world — the <b style={{ color: 'var(--page)', fontWeight: 600 }}>Condé Nast Gold List</b> and <b style={{ color: 'var(--page)', fontWeight: 600 }}>Forbes Five-Star</b>, with more of the industry&rsquo;s most respected lists added every week.
              </p>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--on-dark-soft)', marginBottom: 18 }}>
                And every breakout is measured against <em style={{ fontStyle: 'normal', color: 'var(--signal-light)', fontWeight: 600 }}>that hotel&rsquo;s own</em> engagement baseline — so a boutique property&rsquo;s win surfaces right next to a global flagship&rsquo;s. It&rsquo;s not about who&rsquo;s biggest. It&rsquo;s about the best ideas. It&rsquo;s about what&rsquo;s working.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--on-dark-soft)', fontStyle: 'italic' }}>
                Content Radar is independent and is not affiliated with, endorsed by, or sponsored by these publications. All figures are drawn from public Instagram data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT YOU GET ===== */}
      <section style={{ ...INNER, padding: '100px 40px' }}>
        <div data-reveal style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <div style={{ ...eyebrow(), marginBottom: 22 }}>What you get</div>
          <h2 style={sectionTitle}>Four ways to never face a blank calendar again.</h2>
        </div>
        <div className="cr-whatyouget-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          {[
            { idx: '01 · this week', title: 'This Week’s Breakouts', body: 'Never face a blank content calendar again. The posts proven to work this week, ranked best-first.' },
            { idx: '02 · the library', title: 'The 30-Day & All-Time Leaderboard', body: 'The best posts we’ve ever found, not just this week’s. A permanent library to draw from.' },
            { idx: '03 · the strategy', title: 'The Posting Playbook', body: 'See when and how often the best hotels have been posting, and how it moves their engagement. The strategy thinking, done for you.' },
            { idx: '04 · coming soon', title: 'TikTok & YouTube — September 2026', body: 'More channels are coming. Founding members — the first 50 — lock in this Instagram rate for good.' },
          ].map((c, i) => (
            <div key={c.idx} data-reveal data-reveal-delay={(i % 2) * 90} data-card style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 38, transition: 'transform .16s, box-shadow .16s' }}>
              <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--signal)', marginBottom: 16 }}>{c.idx}</div>
              <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginBottom: 12 }}>{c.title}</h3>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--body-soft)' }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" style={{ ...INNER, padding: '100px 40px 56px' }}>
        <div data-reveal style={{ maxWidth: 520, margin: '0 auto', background: 'var(--ink-deep)', borderRadius: 20, padding: '48px 44px', textAlign: 'center', boxShadow: '0 40px 80px -50px rgba(34,32,27,0.7)' }}>
          <div style={{ ...eyebrow('var(--signal-light)'), marginBottom: 24 }}>Founding Member</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 72, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--surface)' }}>£{FOUNDING_PRICE}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 18, color: 'var(--on-dark-soft)' }}>/month</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: 'var(--signal-light)', marginBottom: 28 }}>Instagram channel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 300, margin: '0 auto 32px' }}>
            {[
              'Fixed forever — first 50 members only',
              `${TRIAL_DAYS}-day free trial to start`,
              'Cancel anytime',
            ].map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: 'var(--page)' }}><span style={{ color: 'var(--signal)' }}>✓</span> {t}</div>
            ))}
          </div>
          <div style={{ marginBottom: 22, textAlign: 'left', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--signal-light)' }}><b style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--surface)', fontSize: 14 }}>{FOUNDING_CLAIMED}</b> of {FOUNDING_CAP} founding spots claimed</span>
              <span style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 11, color: 'var(--body-mid)' }}>{spotsLeft} left</span>
            </div>
            <div style={{ height: 6, borderRadius: 6, background: 'rgba(247,246,242,0.14)', overflow: 'hidden' }}>
              <div data-progress style={{ height: '100%', width: claimedPct, background: 'var(--signal)', borderRadius: 6 }} />
            </div>
          </div>
          <Link href={TRIAL_HREF} className="cr-cta-light" style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 17, color: 'var(--ink-deep)', background: 'var(--surface)', padding: 17, borderRadius: 12, textDecoration: 'none', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--body-mid)', marginTop: 22 }}>More channels are coming. Founding members lock in this rate on Instagram for good.</p>
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
            { q: 'Where does the data come from?', a: 'Only hotels already certified as the best in the world — the Condé Nast Gold List and Forbes Five-Star, with more respected lists added weekly. Never a random scrape.' },
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
          <h2 data-reveal style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(30px,5vw,54px)', lineHeight: 1.08, letterSpacing: '-0.03em', color: 'var(--surface)', marginBottom: 36, textWrap: 'balance' }}>See this week&rsquo;s winners<br />before you pay.</h2>
          <div data-reveal data-reveal-delay={120}>
            <Link href={TRIAL_HREF} className="cr-cta-light" style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 17, color: 'var(--ink-deep)', background: 'var(--surface)', padding: '18px 44px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .2s, background .2s' }}>start your free trial <CtaArrow /></Link>
            <div style={{ fontFamily: 'var(--font-label)', fontWeight: 600, fontSize: 12, letterSpacing: '0.03em', color: 'var(--on-dark-soft)', marginTop: 14 }}>{CTA_SUB}</div>
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
              { head: 'Company', links: [{ t: 'High Elm Studio', h: '#' }, { t: 'Contact', h: '#' }] },
              { head: 'Legal', links: [{ t: 'Privacy Policy', h: '#' }, { t: 'Terms of Service', h: '#' }] },
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

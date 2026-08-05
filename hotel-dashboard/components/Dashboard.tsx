'use client';

import { Fragment, useEffect, useState } from 'react';
import type { DashboardData, HotelRow, OutlierPost, WwLever, WwLeverBar } from '@/lib/data';
import { fmtFollowers } from '@/lib/format';
import ContentRadar from './ContentRadar';
import WhatsWorkingPanel from './WhatsWorking';
import HotelTable from './HotelTable';
import PageInfoButton from './PageInfoButton';
import type { InfoKey } from './PageInfo';

const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";
const DISPLAY = "var(--font-display), 'Space Grotesk', sans-serif";

// "About this view" affordance at the top of a dashboard section — the same ⓘ +
// verbatim PageInfo copy that used to live behind the sidebar's per-section icons.
// Moved here (out of the nav) so the explanation sits next to the thing it explains.
function SectionInfo({ infoKey }: { infoKey: InfoKey }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
      <PageInfoButton infoKey={infoKey} />
      <span style={{ fontFamily: LABEL, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)' }}>
        About this view
      </span>
    </div>
  );
}

// The lists every tracked hotel is drawn from — shown on the overview so members
// can see the sourcing is the industry's own, not ours.
//
// Michelin Keys was removed on 2026-07-31: the panel claimed we crawl the list,
// but only 20 of its 139 hotels are tracked and 107 aren't in the database at
// all — The Ritz, The Peninsula, Cliveden and Chewton Glen among them, which any
// UK hotelier would notice at a glance. The per-hotel Michelin pins on the
// leaderboard STAY: those come from a verified CSV and are correct for the
// hotels that carry them. Only put a list back here once it is actually crawled.
const SOURCES: { name: string; sub: string }[] = [
  { name: 'Forbes Travel Guide', sub: 'Five-star list' },
  { name: 'Condé Nast Traveller', sub: 'Gold List' },
  { name: 'The World’s 50 Best Hotels', sub: 'Annual ranking' },
];

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
const normHandle = (h: string) => h.trim().toLowerCase().replace(/^@/, '').replace(/\/+$/, '');

// Content width cap applied inside every band
const INNER: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  paddingLeft: 40,
  paddingRight: 40,
};

// The "in focus" bullets — the portfolio's 30-day patterns, each stated as a
// COMPARISON rather than a bare figure.
//
// ⚠ These read `whatsWorkingData.month.levers`, the SAME data What's Working
// renders, not the older `data.whatsWorking` bars. That matters for two reasons
// the old version got wrong (fixed 2026-08-05):
//
//  1. It printed a raw median engagement rate — "Videos … 0.2% median
//     engagement". A per-post ER is a fraction of a percent for almost every
//     hotel, so the true figure reads like failure unless you already know the
//     scale. Levers exist precisely to avoid this: every bar is expressed as a
//     MULTIPLE of the weakest option, which needs no explaining.
//  2. It sat under a heading that said "This week". It never was this week —
//     `data.whatsWorking` is a 30-day window. The heading now says so.
//
// A lever with too little data is omitted upstream by buildLevers, so a missing
// bullet here means "not enough posts to say", never "nothing happened".
const FOCUS_STRONG = { color: '#F7F6F2', fontWeight: 600 } as const;

/** The leader and the baseline of a lever's bars. `ratio` is the multiple of
 *  the weakest bar and the weakest itself carries null, so the baseline is the
 *  null and the leader is the largest ratio. Day bars stay in week order rather
 *  than sorted, so neither can be taken positionally. */
function leadAndBase(lever: WwLever): { lead: WwLeverBar; base: WwLeverBar; times: string } | null {
  const base = lever.bars.find(b => b.ratio === null);
  const rated = lever.bars.filter(b => b.ratio !== null);
  if (!base || rated.length === 0) return null;
  const lead = rated.reduce((a, b) => ((b.ratio ?? 0) > (a.ratio ?? 0) ? b : a));
  const ratio = lead.ratio ?? 1;
  // Below 1.05× the gap is rounding, not a pattern worth a sentence.
  if (ratio < 1.05) return null;
  return { lead, base, times: `${ratio.toFixed(1)}×` };
}

function portfolioInFocus(data: DashboardData): React.ReactNode[] {
  const levers = data.whatsWorkingData?.month?.levers ?? [];
  const bullets: React.ReactNode[] = [];
  const by = (id: WwLever['id']) => levers.find(l => l.id === id);

  const fmt = by('format');
  const fmtParts = fmt ? leadAndBase(fmt) : null;
  if (fmt && fmtParts) {
    bullets.push(
      <>
        <span style={FOCUS_STRONG}>{pluralFormat(fmtParts.lead.label)}</span> earn{' '}
        <span style={FOCUS_STRONG}>{fmtParts.times}</span> the engagement of{' '}
        {pluralFormat(fmtParts.base.label).toLowerCase()}, post for post.
      </>,
    );
  }

  const cap = by('caption');
  const capParts = cap ? leadAndBase(cap) : null;
  if (cap && capParts) {
    bullets.push(
      <>
        <span style={FOCUS_STRONG}>{captionPhrase(capParts.lead.label)}</span> pull{' '}
        <span style={FOCUS_STRONG}>{capParts.times}</span> what{' '}
        {captionPhrase(capParts.base.label).toLowerCase()} do.
      </>,
    );
  }

  const day = by('day');
  const dayParts = day ? leadAndBase(day) : null;
  if (day && dayParts) {
    bullets.push(
      <>
        <span style={FOCUS_STRONG}>{WEEKDAY_LONG[dayParts.lead.label] ?? dayParts.lead.label}</span>{' '}
        is the strongest day to post — <span style={FOCUS_STRONG}>{dayParts.times}</span> the
        engagement of {WEEKDAY_LONG[dayParts.base.label] ?? dayParts.base.label}, the quietest.
      </>,
    );
  }

  return bullets.slice(0, 5);
}

function pluralFormat(label: string): string {
  const map: Record<string, string> = { Reel: 'Reels', Video: 'Videos', Carousel: 'Carousels', Photo: 'Photos' };
  return map[label] ?? `${label}s`;
}
function captionPhrase(label: string): string {
  const map: Record<string, string> = {
    Short: 'Shorter captions',
    Medium: 'Medium-length captions',
    Long: 'Longer captions',
  };
  return map[label] ?? `${label} captions`;
}
// by_day labels are abbreviated for the What's Working bar charts ("Wed"); in a
// prose bullet the full weekday reads better. Falls through unchanged if the
// label is already long-form or unrecognised.
const WEEKDAY_LONG: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

// Shared panel chrome for the two lower overview cards (watchlist / sources).
const PANEL: React.CSSProperties = {
  border: '1px solid rgba(245,240,232,0.13)',
  borderRadius: 14,
  background: 'var(--panel-dark)',
  overflow: 'hidden',
};
const PANEL_LABEL: React.CSSProperties = {
  fontFamily: LABEL,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: 'var(--muted-dark)',
};
/** The figures inside the hero's inline meta line — lifted out of the label grey. */
const META_FIG: React.CSSProperties = { color: '#CFC9BE', fontWeight: 600 };

// ─── Your watchlist — the member's followed hotels, or an empty-state nudge ────
function WatchlistPanel({ hotels, handles }: { hotels: HotelRow[]; handles: string[] }) {
  const wanted = new Set(handles.map(normHandle));
  const rows = hotels.filter(h => wanted.has(normHandle(h.instagram_handle)));

  return (
    <div style={PANEL}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '22px 26px',
          borderBottom: '1px solid rgba(245,240,232,0.10)',
        }}
      >
        <span style={PANEL_LABEL}>Your hotel watchlist</span>
        <a
          href="#leaderboard"
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--signal-light)',
            textDecoration: 'none',
          }}
        >
          Manage →
        </a>
      </div>

      {rows.length > 0 ? (
        <div>
          {rows.map((h, i) => {
            const followersStr = fmtFollowers(h.followers_count);
            const sub = [h.region, followersStr !== '—' ? `${followersStr} followers` : null]
              .filter(Boolean)
              .join(' · ');
            const note = h.engagement_rate != null ? `${h.engagement_rate.toFixed(2)}% eng.` : null;
            return (
              <div
                key={h.instagram_handle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 26px',
                  borderBottom: i < rows.length - 1 ? '1px solid rgba(245,240,232,0.08)' : 'none',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: 'none',
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'rgba(245,240,232,0.06)',
                    color: 'var(--signal-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {nameInitials(h.name)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#F7F6F2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.name}
                  </span>
                  {sub && (
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted-dark)', marginTop: 1 }}>
                      {sub}
                    </span>
                  )}
                </span>
                {note && <span style={{ fontSize: 13, color: '#CFC9BE', textAlign: 'right' }}>{note}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '40px 26px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 16,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '1px solid rgba(245,240,232,0.16)',
              color: 'var(--signal-light)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <div style={{ maxWidth: 380 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#F7F6F2', marginBottom: 6 }}>
              Nothing on your hotel watchlist yet
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#A49D92', margin: 0 }}>
              Follow the hotels you care about and their breakouts surface here first, every week.
            </p>
          </div>
          {/* Primary → the watchlist page itself; the quiet second link stays on the
              in-dashboard leaderboard, which is the other place hotels get added. */}
          <a
            href="/watchlist"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#F7F6F2',
              background: 'var(--signal)',
              borderRadius: 10,
              padding: '12px 24px',
              textDecoration: 'none',
            }}
          >
            Add hotels to your watchlist
          </a>
          <a href="#leaderboard" style={{ fontSize: 12, fontWeight: 600, color: 'var(--signal-light)', textDecoration: 'none' }}>
            Browse the hotel leaderboard →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Sources crawled — the industry lists every tracked hotel is drawn from ────
function SourcesPanel() {
  return (
    <div style={PANEL}>
      <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(245,240,232,0.10)' }}>
        <div style={{ ...PANEL_LABEL, marginBottom: 8 }}>Sources crawled</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#A49D92', margin: 0, maxWidth: 560 }}>
          Every tracked hotel is drawn from the lists the industry already trusts.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '20px 26px 24px' }}>
        {SOURCES.map(src => (
          <span
            key={src.name}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: 2,
              background: 'rgba(245,240,232,0.05)',
              border: '1px solid rgba(245,240,232,0.13)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: '#F7F6F2', lineHeight: 1.2 }}>{src.name}</span>
            <span
              style={{
                fontFamily: LABEL,
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--muted-dark)',
              }}
            >
              {src.sub}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** The way through to the ranked week. This replaced the three-tile breakout row
 *  (removed 2026-08-05): the tiles were the top three by multiplier, but shown
 *  that large and that high they read as a curated pick, which the dashboard
 *  doesn't make. A week with no breakouts at all shows nothing — the hero above
 *  already says so, and "see all 0" is not a link worth offering. */
function BreakoutsLink({ total }: { total: number }) {
  if (total <= 0) return null;
  return (
    <div>
      <a
        href="#breakouts"
        style={{ fontSize: 14, fontWeight: 600, color: 'var(--signal-light)', textDecoration: 'none' }}
      >
        See {total === 1 ? 'the one breakout' : `all ${total} breakouts`} →
      </a>
    </div>
  );
}

// ─── This week — full-screen dark signal band ─────────────────────────────────
function Hero({
  data,
  watchlistHandles,
}: {
  data: DashboardData;
  watchlistHandles: string[];
}) {
  const focus = portfolioInFocus(data);

  // The band's supporting numbers — one quiet inline line rather than a stat
  // panel, so the breakout count stays the only figure with weight.
  const meta: React.ReactNode[] = [
    <><span style={META_FIG}>{data.hotel_count}</span> hotels tracked</>,
    <><span style={META_FIG}>{data.countries_count}</span> countries</>,
    <><span style={META_FIG}>{data.total_posts_analysed.toLocaleString('en-GB')}</span> posts analysed</>,
    <>Week ending <span style={META_FIG}>{data.week_ending}</span></>,
  ];

  return (
    <div
      id="overview"
      style={{
        background: 'var(--ink-deep)',
        color: '#F7F6F2',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="cr-inner"
        style={{ ...INNER, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 44, paddingTop: 56, paddingBottom: 56 }}
      >
        {/* ── Headline ── */}
        <div>
          <div
            style={{
              fontFamily: LABEL,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.24em',
              color: 'var(--muted-dark)',
              marginBottom: 26,
            }}
          >
            This week · Instagram
          </div>

          {data.breakout_count > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 26, flexWrap: 'wrap' }}>
                <span
                  className="cr-display cr-hero-numeral"
                  style={{ fontSize: 156, lineHeight: 0.78, letterSpacing: '-0.04em', color: 'var(--signal)' }}
                >
                  {data.breakout_count}
                </span>
                <span style={{ fontSize: 30, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2, paddingTop: 10 }}>
                  {data.breakout_count === 1 ? 'post' : 'posts'} significantly<br />outperformed
                </span>
              </div>
              <p style={{ maxWidth: 560, fontSize: 15, lineHeight: 1.75, color: '#A49D92', marginTop: 26 }}>
                Every one of them doubled what its hotel normally gets
                {data.super_breakout_count > 0 ? (
                  <>
                    {' '}— and <span style={{ color: '#F7F6F2' }}>{data.super_breakout_count}</span> went past
                    ten times
                  </>
                ) : null}
                . Refreshed every week.
              </p>
            </>
          ) : (
            <p style={{ fontSize: 30, lineHeight: 1.4, maxWidth: 560, margin: 0 }}>
              No posts significantly outperformed their hotel&rsquo;s own median this week.
            </p>
          )}

          {/* Supporting numbers — quiet, inline, dot-separated */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 14,
              marginTop: 22,
              fontFamily: LABEL,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--muted-dark)',
            }}
          >
            {meta.map((m, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    style={{ flex: 'none', width: 3, height: 3, borderRadius: '50%', background: 'rgba(245,240,232,0.3)' }}
                  />
                )}
                <span>{m}</span>
              </Fragment>
            ))}
          </div>
        </div>

        {/* ── Straight through to the ranked week ──
            ⚠ The three big media tiles that used to sit here were removed
            2026-08-05. They were simply the top three by multiplier, but at that
            size, above everything else, they read as an editorial selection the
            dashboard doesn't make — and they took the first impression. The
            count is already in the numeral above and the full ranking is one
            click away, so the link carries this on its own. */}
        <BreakoutsLink total={data.breakout_count} />

        {/* ── In focus — the 30-day patterns, stated as comparisons ── */}
        <div style={PANEL}>
          <div style={{ ...PANEL_LABEL, padding: '22px 26px', borderBottom: '1px solid rgba(245,240,232,0.10)' }}>
            Last 30 days · in focus
          </div>
          {focus.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: '10px 26px 22px', display: 'flex', flexDirection: 'column' }}>
              {focus.map((b, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    padding: '13px 0',
                    borderBottom: i < focus.length - 1 ? '1px solid rgba(245,240,232,0.08)' : 'none',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: 'var(--signal-light)', marginTop: 7 }}
                  />
                  <span style={{ fontSize: 14, lineHeight: 1.6, color: '#CFC9BE' }}>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '22px 26px', fontSize: 14, color: '#A49D92', lineHeight: 1.6 }}>
              Not enough posts yet to state a pattern we&rsquo;d stand behind — check back after the
              next scrape.
            </div>
          )}
          {/* Straight through to the full working-out behind these three lines. */}
          <div style={{ padding: '0 26px 22px' }}>
            <a
              href="#working"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--signal-light)', textDecoration: 'none' }}
            >
              More performance insight →
            </a>
          </div>
        </div>

        {/* ── Sources crawled ── */}
        <SourcesPanel />

        {/* ── Your watchlist ── */}
        <WatchlistPanel hotels={data.hotels} handles={watchlistHandles} />
      </div>
    </div>
  );
}

// ─── Section model ────────────────────────────────────────────────────────────
// The dashboard is a set of switchable panels rather than one long scroll. The
// active panel is driven by the URL hash so the LEFT SIDEBAR's section links
// (#overview / #breakouts / #working / #leaderboard) select the view — there is
// no top nav. Only the active section is mounted, so each scrolls on its own.
// Per-section explanations now live behind the sidebar's "i" (About this view).
// ⚠ 'featured' is WITHDRAWN (2026-08-04), not deleted. It was pulled after the
// hidden-likes fix re-baselined the picks: an Editor's Pick is a permanent manual
// flag and curated mode skips every gate, so an Ashford Castle post that read
// 65.7x when picked was still sitting on the "worth replicating" shelf at 0.4x.
// The shelf needs a floor before it comes back. components/FeaturedPosts.tsx,
// lib/data.ts selectFeaturedPosts + data.featured, and their tests are all still
// here — restoring is: re-add the FeaturedPosts import, put 'featured' back in
// this list, in AppShell's RADAR_SECTIONS + INNER_SECTIONS (and its FeaturedIcon),
// in PageInfo's resolveInfoKey, and re-mount the section below.
const SECTION_IDS = ['overview', 'breakouts', 'working', 'leaderboard'] as const;
type SectionId = (typeof SECTION_IDS)[number];

function readHash(): SectionId {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace(/^#/, '');
  return (SECTION_IDS.includes(h as SectionId) ? h : 'overview') as SectionId;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard({
  data,
  regions,
  savedPostKeys = [],
  watchlistHandles = [],
}: {
  data: DashboardData;
  regions: string[];
  savedPostKeys?: string[];
  watchlistHandles?: string[];
}) {
  // Server renders the default; the client reconciles to the hash after mount and
  // then follows hashchange (fired by the sidebar's section links).
  const [active, setActive] = useState<SectionId>('overview');

  useEffect(() => {
    const sync = () => {
      setActive(readHash());
      window.scrollTo({ top: 0 });
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const sectionPad: React.CSSProperties = { ...INNER, paddingTop: 40, paddingBottom: 48 };

  return (
    <div className="cr-board">
      {/* ── This week (overview) ── */}
      {active === 'overview' && (
        <Hero data={data} watchlistHandles={watchlistHandles} />
      )}

      {/* ── Top posts — filters then posts, no heading copy ── */}
      {active === 'breakouts' && (
        <div className="cr-inner" style={sectionPad}>
          <SectionInfo infoKey="breakouts" />
          <ContentRadar postsByWindow={data.standout} savedPostKeys={savedPostKeys} regions={regions} />
        </div>
      )}

      {/* ── Featured — WITHDRAWN 2026-08-04, see the note on SECTION_IDS ── */}

      {/* ── What's working ── */}
      {active === 'working' && (
        <div className="cr-inner" style={sectionPad}>
          <WhatsWorkingPanel data={data.whatsWorkingData} />
        </div>
      )}

      {/* ── Hotel leaderboard ── */}
      {active === 'leaderboard' && (
        <div className="cr-inner" style={sectionPad}>
          <SectionInfo infoKey="leaderboard" />
          <HotelTable hotels={data.hotels} regions={regions} watchlistHandles={watchlistHandles} />
        </div>
      )}

      {/* Footer is provided by AppShell (shared across all gated pages). */}
    </div>
  );
}

import type { DashboardData } from '@/lib/data';
import ContentRadar from './ContentRadar';
import WhatsWorkingPanel from './WhatsWorking';
import HotelTable from './HotelTable';
import Lockup from './Lockup';
import InfoPopover from './InfoPopover';

const LABEL = "var(--font-label), 'Space Mono', monospace";

// Content width cap applied inside every band
const INNER: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  paddingLeft: 40,
  paddingRight: 40,
};

// ─── Pill toggle (channel switcher / timeframe) ───────────────────────────────
export function PillToggle({ items }: { items: { label: string; active?: boolean; soon?: boolean }[] }) {
  return (
    <div
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
      {items.map(item => (
        <div
          key={item.label}
          className={item.soon ? 'cr-pill-soon' : undefined}
          title={item.soon ? 'Coming soon' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            borderRadius: 6,
            padding: '6px 13px',
            fontSize: 12,
            fontWeight: 500,
            background: item.active ? 'var(--ink)' : 'transparent',
            color: item.active ? 'var(--surface)' : 'var(--muted)',
            cursor: item.active ? 'default' : 'not-allowed',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {item.active && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--signal)',
                flexShrink: 0,
              }}
            />
          )}
          {item.label}
          {item.soon && (
            <span
              style={{
                fontFamily: LABEL,
                fontSize: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--faint)',
              }}
            >
              soon
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHead({
  eyebrow,
  title,
  sub,
  info,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  info?: { title: string; body: React.ReactNode };
}) {
  return (
    <div>
      <div className="cr-eyebrow" style={{ marginBottom: 12 }}>{eyebrow}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0 }}>
          {title}
        </h2>
        {info && <InfoPopover title={info.title}>{info.body}</InfoPopover>}
      </div>
      {sub && (
        <p style={{ fontSize: 14, color: 'var(--body-mid)', marginTop: 8, maxWidth: 640, lineHeight: 1.6 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Hero — dark signal band ──────────────────────────────────────────────────
function Hero({ data }: { data: DashboardData }) {
  const stats = [
    { figure: <>{data.hotel_count}<span style={{ color: 'var(--signal)' }}>+</span></>, caption: '5-star hotels' },
    { figure: <>{data.countries_count}</>, caption: 'Countries' },
    { figure: <>{data.total_posts_analysed.toLocaleString('en-GB')}</>, caption: 'Posts analysed' },
    { figure: <>{data.week_ending}</>, caption: 'Week ending' },
  ];

  return (
    <div id="overview" style={{ background: 'var(--ink-deep)', color: '#F7F6F2' }}>
      <div className="cr-inner" style={{ ...INNER, paddingTop: 72, paddingBottom: 76 }}>
        <div
          className="cr-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          {/* Left — the signal */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
              <span
                style={{
                  fontFamily: LABEL,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.24em',
                  color: 'var(--muted-dark)',
                }}
              >
                This week · Instagram
              </span>
              <InfoPopover title="What this number means" label="What does this number mean?" onDark>
                <>
                  This counts the posts across all tracked hotels that, in the last 7 days,
                  <strong> beat their own hotel&rsquo;s typical engagement by 2× or more</strong> — a
                  like-for-like measure, so it rewards a post outperforming its account rather than
                  raw follower count.
                  <br /><br />
                  It refreshes every week. Scroll down to <strong>Top posts</strong> to see the posts
                  behind the number.
                </>
              </InfoPopover>
            </div>

            {data.breakout_count > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, flexWrap: 'wrap' }}>
                  <span
                    className="cr-display cr-hero-numeral"
                    style={{ fontSize: 132, lineHeight: 0.8, letterSpacing: '-0.04em', color: 'var(--signal)' }}
                  >
                    {data.breakout_count}
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.25, paddingTop: 8 }}>
                    {data.breakout_count === 1 ? 'post' : 'posts'} significantly<br />outperformed
                  </span>
                </div>
                <p style={{ maxWidth: 440, fontSize: 14, lineHeight: 1.75, color: '#A49D92', marginTop: 24 }}>
                  Their hotel&rsquo;s own median this week
                  {data.super_breakout_count > 0 ? (
                    <>
                      {' '}— and <span style={{ color: '#F7F6F2' }}>{data.super_breakout_count}</span> cleared
                      ten times their usual engagement
                    </>
                  ) : null}
                  {' '}— refreshed every week.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 26, lineHeight: 1.4, maxWidth: 560, margin: 0 }}>
                No posts significantly outperformed their hotel&rsquo;s own median this week.
              </p>
            )}
          </div>

          {/* Right — by the numbers */}
          <div
            style={{
              border: '1px solid rgba(245,240,232,0.13)',
              borderRadius: 14,
              background: 'var(--panel-dark)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'var(--muted-dark)',
                padding: '24px 28px',
                borderBottom: '1px solid rgba(245,240,232,0.10)',
              }}
            >
              This week · by the numbers
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                background: 'rgba(245,240,232,0.10)',
              }}
            >
              {stats.map(s => (
                <div key={s.caption} style={{ background: 'var(--panel-dark)', padding: '24px 28px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{s.figure}</div>
                  <div
                    style={{
                      fontFamily: LABEL,
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: 'var(--muted-dark)',
                      marginTop: 5,
                    }}
                  >
                    {s.caption}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const sectionRule: React.CSSProperties = {
    marginTop: 56,
    paddingTop: 56,
    borderTop: '1px solid var(--line-rule)',
  };

  return (
    <div className="cr-board">
      {/* ── Top bar ── */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <div
          className="cr-inner cr-topbar"
          style={{
            ...INNER,
            paddingTop: 20,
            paddingBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Lockup variant="primary" size={30} />
          <PillToggle
            items={[
              { label: 'Instagram', active: true },
              { label: 'TikTok', soon: true },
              { label: 'YouTube', soon: true },
            ]}
          />
        </div>
      </div>

      {/* ── Hero ── */}
      <Hero data={data} />

      {/* ── Top posts ── */}
      <div id="breakouts" className="cr-inner" style={{ ...INNER, paddingTop: 56 }}>
        <SectionHead
          eyebrow="Content that stood out"
          title="Top posts"
          sub="Posts that beat their hotel's own median by 2× or more — choose a time window"
          info={{
            title: 'How Top posts works',
            body: (
              <>
                Each post here beat <strong>its own hotel&rsquo;s typical (median) engagement</strong> by
                2× or more — so a small hotel punching above its weight ranks alongside a giant.
                <br /><br />
                <strong>How to use it:</strong> switch the time window (7 days / 30 days / all time),
                use the filter chips to focus on Reels, images &amp; carousels, or hide collaboration
                posts, and hit <strong>Save</strong> on any card to revisit it on your Saved page.
              </>
            ),
          }}
        />
        <div style={{ marginTop: 32 }}>
          <ContentRadar postsByWindow={data.standout} savedPostKeys={savedPostKeys} />
        </div>
      </div>

      {/* ── What's working ── */}
      <div id="working" className="cr-inner" style={{ ...INNER, ...sectionRule }}>
        <SectionHead
          eyebrow="Portfolio patterns"
          title="What's working"
          info={{
            title: 'How to read this',
            body: (
              <>
                Patterns shared by the best-performing content across <strong>all tracked hotels</strong>{' '}
                over the last 30 days — which <strong>formats, caption lengths, days and times</strong>{' '}
                correlate with higher engagement.
                <br /><br />
                <strong>How to use it:</strong> use it to shape your own posting mix, and open{' '}
                <em>Show more detail</em> for timing and frequency. These are correlations across the
                portfolio, not guarantees for any single account.
              </>
            ),
          }}
        />
        <WhatsWorkingPanel
          whatsWorking={data.whatsWorking}
          snapshot={data.snapshot}
          frequency={data.frequency}
        />
      </div>

      {/* ── Hotel leaderboard ── */}
      <div id="leaderboard" className="cr-inner" style={{ ...INNER, ...sectionRule, paddingBottom: 24 }}>
        <SectionHead
          eyebrow="Ranked by engagement rate"
          title="Hotel leaderboard"
          sub="Average engagement across each hotel's last 30 posts · click a column to re-sort."
          info={{
            title: 'How the leaderboard works',
            body: (
              <>
                Every tracked hotel ranked by <strong>engagement rate</strong> — mean (likes + comments)
                on its last 30 posts ÷ followers × 100 — so reach is measured fairly across follower sizes.
                <br /><br />
                <strong>How to use it:</strong> click any column to re-sort, search or filter by region,
                add a hotel to your <strong>Watchlist</strong>, and look for pins marking Forbes, Gold List,
                World&rsquo;s 50 Best or Michelin Keys hotels. A <span style={{ color: 'var(--signal-deep)' }}>⚠</span>{' '}
                flags a low-confidence figure.
              </>
            ),
          }}
        />
        <HotelTable hotels={data.hotels} regions={regions} watchlistHandles={watchlistHandles} />
      </div>

      {/* ── About ── */}
      <div className="cr-inner" style={{ ...INNER, ...sectionRule, paddingBottom: 40 }}>
        <div style={{ maxWidth: 680 }}>
          <p style={{ fontSize: 13, color: 'var(--body-soft)', lineHeight: 1.7, margin: '0 0 10px' }}>
            The Content Radar — powered by High Elm Studio — tracks Instagram performance across the
            world&rsquo;s most prestigious luxury hotels. Every week you get a snapshot of content that
            significantly outperforms each hotel&rsquo;s own median, giving marketing teams a continuously
            updated library of what&rsquo;s genuinely working.
          </p>
          <p style={{ fontSize: 13, color: 'var(--body-soft)', lineHeight: 1.7, margin: 0 }}>
            Built on public Instagram data only: followers, likes, comments, captions, post types, dates.
            No reach, impressions, saves or shares — those are private to each account.
          </p>
        </div>
      </div>

      {/* Footer is provided by AppShell (shared across all gated pages). */}
    </div>
  );
}

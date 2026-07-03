import Link from 'next/link';
import type { DashboardData } from '@/lib/data';
import { BreakoutCard } from './ContentRadar';
import Lockup from './Lockup';

const LABEL = "var(--font-label), 'Space Mono', monospace";
const DISPLAY = "var(--font-display), 'Baloo 2', sans-serif";

// All trial CTAs point at the placeholder route until Stripe Checkout exists.
// Swap this single constant when the real checkout URL is ready.
const TRIAL_HREF = '/start-trial';

const INNER: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  paddingLeft: 40,
  paddingRight: 40,
};

function Kicker({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <div
      style={{
        fontFamily: LABEL,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.24em',
        color: onDark ? 'var(--muted-dark)' : 'var(--muted)',
      }}
    >
      {children}
    </div>
  );
}

function TrialButton({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <Link
      href={TRIAL_HREF}
      className="cr-lift"
      style={{
        display: 'inline-block',
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
        color: light ? 'var(--ink)' : '#F7F6F2',
        background: light ? '#F7F6F2' : 'var(--ink)',
        border: light ? '1px solid rgba(245,240,232,0.2)' : '1px solid var(--ink)',
        borderRadius: 10,
        padding: '13px 26px',
      }}
    >
      {children}
    </Link>
  );
}

// ─── Hero — dark band with live proof ────────────────────────────────────────
function LandingHero({ data }: { data: DashboardData }) {
  const stats = [
    { figure: <>{data.hotel_count}<span style={{ color: 'var(--signal)' }}>+</span></>, caption: '5-star hotels' },
    { figure: <>{data.countries_count}</>, caption: 'Countries' },
    { figure: <>{data.total_posts_analysed.toLocaleString('en-GB')}</>, caption: 'Posts analysed' },
    { figure: <>{data.week_ending}</>, caption: 'Week ending' },
  ];

  return (
    <div style={{ background: 'var(--ink-deep)', color: '#F7F6F2' }}>
      <div className="cr-inner" style={{ ...INNER, paddingTop: 76, paddingBottom: 80 }}>
        <div
          className="cr-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.35fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          {/* Left — the pitch */}
          <div>
            {/* The top-bar lockup already carries "Powered by High Elm Studio" —
                prime hero position goes to who this is for */}
            <div style={{ marginBottom: 26 }}>
              <Kicker onDark>For anyone running social media for a hotel</Kicker>
            </div>
            <h1
              style={{
                fontSize: 'clamp(34px, 4.6vw, 54px)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.08,
                margin: 0,
              }}
            >
              Never run out of proven Instagram ideas — from the best hotels on Earth.
            </h1>
            <p style={{ maxWidth: 520, fontSize: 15, lineHeight: 1.75, color: '#A49D92', marginTop: 22 }}>
              Every week, Content Radar tracks {data.hotel_count}+ of the world&rsquo;s finest hotels —
              the ones Cond&eacute; Nast and Forbes already certified — and surfaces the exact posts
              beating their own engagement. The last 7 days, the last 30 days, and all time: an ideas
              library that only grows. Ranked best-first, dated, and ready to adapt for your own hotel.
            </p>

            {data.breakout_count > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 30, flexWrap: 'wrap' }}>
                  <span
                    className="cr-display"
                    style={{ fontSize: 64, lineHeight: 0.9, letterSpacing: '-0.03em', color: 'var(--signal)' }}
                  >
                    {data.breakout_count}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.35, maxWidth: 340 }}>
                    {data.breakout_count === 1 ? 'post' : 'posts'}{' '}beat their hotel&rsquo;s own
                    average by 2&times; or more — in the last 7 days alone
                  </span>
                </div>
                <p style={{ maxWidth: 440, fontSize: 13, lineHeight: 1.7, color: '#A49D92', marginTop: 14 }}>
                  Every week, we show you every post that outperforms its own hotel&rsquo;s average by
                  2&times; — ranked best-first, no exceptions.
                </p>
              </>
            )}

            <div style={{ marginTop: 34 }}>
              <TrialButton light>Start your free trial</TrialButton>
            </div>
          </div>

          {/* Right — by the numbers (same live stats as the dashboard hero) */}
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

// ─── Live taster — real cards, then the locked stack ─────────────────────────
function Taster({ data }: { data: DashboardData }) {
  // Rule (Neil, 2026-07-03): feature the best-performing non-collab posts of
  // the last 30 days — computed as data.landing_featured in lib/data.ts
  const open = data.landing_featured.slice(0, 3);
  const locked = data.landing_featured.slice(3, 5);

  if (open.length === 0) return null;

  return (
    <div className="cr-inner" style={{ ...INNER, paddingTop: 64 }}>
      <Kicker>The live taster</Kicker>
      <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '12px 0 0' }}>
        The best posts of the last 30 days — real, live right now.
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 32 }}>
        {open.map((p, i) => (
          <BreakoutCard key={`${p.post_id}-${p.instagram_handle}`} post={p} rank={i + 1} />
        ))}
      </div>

      {locked.length > 0 && (
        <div style={{ position: 'relative', marginTop: 20 }}>
          <div
            aria-hidden="true"
            // Blurred, non-interactive preview of the next breakout cards
            style={{
              filter: 'blur(14px)',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              maxHeight: 760,
              overflow: 'hidden',
            }}
          >
            {locked.map((p, i) => (
              <BreakoutCard key={`${p.post_id}-${p.instagram_handle}`} post={p} rank={i + 4} />
            ))}
          </div>

          {/* Single overlay across the whole locked stack */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 18,
              padding: '40px 24px',
              background: 'linear-gradient(180deg, rgba(231,227,217,0.35) 0%, rgba(231,227,217,0.88) 70%, var(--page) 100%)',
              borderRadius: 14,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="var(--signal-deep)" strokeWidth="1.8" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="var(--signal-deep)" strokeWidth="1.8" />
            </svg>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', maxWidth: 460, lineHeight: 1.45, margin: 0 }}>
              See every breakout — the last 7 days, the last 30 days and all time — plus the
              patterns behind them and the full hotel leaderboard.
            </p>
            <TrialButton>Start your free trial</TrialButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Statement band ───────────────────────────────────────────────────────────
function PocketBand() {
  return (
    <div style={{ background: 'var(--ink-deep)', marginTop: 64 }}>
      <div className="cr-inner" style={{ ...INNER, paddingTop: 72, paddingBottom: 76, textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 'clamp(30px, 4.2vw, 46px)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.12,
            color: '#F7F6F2',
            margin: 0,
          }}
        >
          Viral hotel content,<br />
          <span style={{ color: 'var(--signal-light)' }}>in your pocket.</span>
        </h2>
        <p style={{ maxWidth: 480, margin: '18px auto 0', fontSize: 14, lineHeight: 1.75, color: '#A49D92' }}>
          Every breakout from the world&rsquo;s best hotels, the moment it happens —
          on any device, refreshed every week.
        </p>
      </div>
    </div>
  );
}

// ─── What you get ─────────────────────────────────────────────────────────────
function StackCard({
  no,
  title,
  children,
  featured,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={featured ? 'cr-stack-featured' : undefined}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: featured ? '34px 36px' : '28px 30px',
        gridColumn: featured ? '1 / -1' : undefined,
      }}
    >
      <div
        style={{
          fontFamily: LABEL,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'var(--muted)',
          marginBottom: 12,
        }}
      >
        {no}
      </div>
      <div style={{ fontSize: featured ? 21 : 17, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--body-strong)', lineHeight: 1.7, marginTop: 10, maxWidth: featured ? 780 : undefined }}>
        {children}
      </div>
    </div>
  );
}

function Stack() {
  return (
    // No top hairline — the dark statement band above already separates
    <div className="cr-inner" style={{ ...INNER, paddingTop: 64 }}>
      <Kicker>What you get</Kicker>
      <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '12px 0 0' }}>
        A library that only grows, and the tools to use it.
      </h2>
      <p style={{ fontSize: 14, color: 'var(--body-mid)', marginTop: 10, maxWidth: 640, lineHeight: 1.65 }}>
        Everything below is live in the product today — no mock-ups, no &ldquo;coming soon&rdquo;
        screenshots. It&rsquo;s the same dashboard the taster above is drawn from.
      </p>

      <div
        className="cr-stack-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 32 }}
      >
        <StackCard no="01" title="An ideas library that never runs out" featured>
          <p style={{ margin: 0 }}>
            Every week, new breakouts land on top of the last — and nothing is thrown away.
            Browse the last 7 days when you need something for tomorrow, the last 30 days when
            you&rsquo;re planning the month, or all time when you want the strongest ideas ever
            recorded. The library compounds every single week you&rsquo;re a member — which means
            the blank content calendar, the Sunday-night scramble for a post idea, the
            &ldquo;what do we even film this week?&rdquo; meeting — all of it goes away.
          </p>
        </StackCard>

        <StackCard no="02" title="The Breakout Feed">
          <p style={{ margin: 0 }}>
            Every post that beats its own hotel&rsquo;s average engagement by 2&times; or more —
            up to 25 a week, ranked best-first. Real likes, real comments, the exact multiplier,
            the date and time it was posted, and a link straight to the post on Instagram so you
            can see precisely how they did it.
          </p>
        </StackCard>

        <StackCard no="03" title="The &ldquo;why it worked&rdquo; read">
          <p style={{ margin: 0 }}>
            Every breakout carries a one-line read on what drove it — the format, the hook, the
            theme — plus tags you can pattern-match against your own property. You&rsquo;re not
            just admiring a great post; you&rsquo;re taking the idea home.
          </p>
        </StackCard>

        <StackCard no="04" title="What&rsquo;s Working — the patterns">
          <p style={{ margin: 0 }}>
            The numbers behind the wins: which formats, caption lengths, days of the week and
            times of day are earning the highest engagement across the whole portfolio — switchable
            between the last 7 days, the last 30 days, and all time. Plus the Posting Playbook:
            how often the top performers post compared to everyone else, so you can set your
            cadence with evidence instead of guesswork.
          </p>
        </StackCard>

        <StackCard no="05" title="The Hotel Leaderboard">
          <p style={{ margin: 0 }}>
            All 200 hotels ranked by true engagement rate — searchable, sortable, and filterable
            by region. See who&rsquo;s genuinely earning attention rather than who simply has the
            most followers, and find the properties most like yours to learn from.
          </p>
        </StackCard>
      </div>

      <p style={{ fontSize: 12, color: 'var(--body-mid)', marginTop: 18 }}>
        Coming for founding members: a weekly plain-English read of what&rsquo;s working across
        luxury hospitality — and more channels beyond Instagram.
      </p>
    </div>
  );
}

// ─── Why believe it ───────────────────────────────────────────────────────────
function Credibility() {
  return (
    <div className="cr-inner" style={{ ...INNER, marginTop: 56, paddingTop: 56, borderTop: '1px solid var(--line-rule)' }}>
      <div style={{ maxWidth: 680 }}>
        <Kicker>Why believe it</Kicker>
        <p style={{ fontSize: 15, color: 'var(--body-strong)', lineHeight: 1.75, margin: '18px 0 0' }}>
          This isn&rsquo;t a random Instagram scrape. Content Radar only tracks hotels already certified
          as the best in the world — the 200 most-followed properties across the Cond&eacute; Nast Gold
          List and Forbes Five-Star, with more of the world&rsquo;s most respected lists being added.
          You don&rsquo;t have to trust us. You just have to trust the lists the industry already trusts.
        </p>
        <p style={{ fontSize: 15, color: 'var(--body-strong)', lineHeight: 1.75, margin: '16px 0 0' }}>
          And every breakout is measured against <strong>that hotel&rsquo;s own</strong> engagement
          baseline — so a boutique property&rsquo;s win surfaces next to a global flagship&rsquo;s.
          It&rsquo;s not about who&rsquo;s biggest. It&rsquo;s about what&rsquo;s working.
        </p>
      </div>
    </div>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  return (
    <div className="cr-inner" style={{ ...INNER, marginTop: 56, paddingTop: 56, borderTop: '1px solid var(--line-rule)' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
        <Kicker>Pricing</Kicker>
        <div
          style={{
            marginTop: 18,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: 'var(--shadow-card)',
            padding: '40px 36px',
          }}
        >
          <div
            style={{
              fontFamily: LABEL,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'var(--muted)',
            }}
          >
            Founding member
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <span
              className="cr-display"
              style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--ink)' }}
            >
              &pound;49
            </span>
            <span style={{ fontSize: 14, color: 'var(--body-mid)' }}>/month · Instagram channel</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--body-strong)', lineHeight: 1.6, margin: '14px 0 0' }}>
            Fixed forever. First 50 members only.<br />Cancel anytime.
          </p>
          <div style={{ marginTop: 24 }}>
            <TrialButton>Start your free trial</TrialButton>
          </div>
          <p style={{ fontSize: 11, color: 'var(--body-mid)', margin: '16px 0 0' }}>
            More channels are coming. Founding members lock in this rate on Instagram for good.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Closing CTA + footer ─────────────────────────────────────────────────────
function Closing({ data }: { data: DashboardData }) {
  return (
    <footer style={{ background: 'var(--ink-deep)', marginTop: 64 }}>
      <div className="cr-inner" style={{ ...INNER, paddingTop: 64, paddingBottom: 30, textAlign: 'center' }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: '#F7F6F2', margin: 0 }}>
          See this week&rsquo;s winners before you pay.
        </h2>
        <div style={{ marginTop: 26 }}>
          <TrialButton light>Start your free trial</TrialButton>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 14 }}>
          &pound;49/month after 14 days · cancel anytime
        </p>
      </div>
      <div
        className="cr-inner"
        style={{
          ...INNER,
          paddingTop: 40,
          paddingBottom: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
        }}
      >
        <Lockup variant="primary" size={30} onDark />
        <span
          style={{
            fontFamily: LABEL,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--muted-dark)',
          }}
        >
          Updated weekly · {data.week_ending_long}
        </span>
      </div>
    </footer>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing({ data }: { data: DashboardData }) {
  return (
    <div className="cr-board">
      {/* Top bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link
              href="/login"
              className="cr-link"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none' }}
            >
              Log in
            </Link>
            <Link
              href={TRIAL_HREF}
              className="cr-link"
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--signal-deep)', textDecoration: 'none' }}
            >
              Start your free trial →
            </Link>
          </div>
        </div>
      </div>

      <LandingHero data={data} />
      <Taster data={data} />
      <PocketBand />
      <Stack />
      <Credibility />
      <Pricing />
      <Closing data={data} />
    </div>
  );
}

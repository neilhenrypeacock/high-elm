import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/PublicChrome';
import { TRIAL_HREF } from '@/lib/links';

export const metadata = {
  title: 'Content Radar — How it works',
  description:
    "How Content Radar finds the hotel posts that beat their own hotel's average by 2× or more — ranked, explained, and updated every week.",
};

const INNER: React.CSSProperties = { maxWidth: 1000, margin: '0 auto', padding: '0 40px' };

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-label), sans-serif',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--signal-deep)',
};

const h2: React.CSSProperties = {
  fontFamily: 'var(--font-body), sans-serif',
  fontWeight: 700,
  fontSize: 'clamp(24px,3.2vw,34px)',
  lineHeight: 1.12,
  letterSpacing: '-0.02em',
  color: 'var(--ink)',
  textWrap: 'balance',
};

const lede: React.CSSProperties = {
  fontSize: 'clamp(16px,1.9vw,18px)',
  lineHeight: 1.7,
  color: 'var(--body-soft)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  boxShadow: 'var(--shadow-card)',
  padding: '30px 30px',
};

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span
          style={{
            flex: 'none',
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--top3-tint)',
            color: 'var(--signal-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {n}
        </span>
        <h3 style={{ fontFamily: 'var(--font-body), sans-serif', fontWeight: 700, fontSize: 19, color: 'var(--ink)', margin: 0 }}>
          {title}
        </h3>
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--body-soft)', margin: 0 }}>{children}</p>
    </div>
  );
}

function TrialCta({ heading, sub }: { heading: string; sub: string }) {
  return (
    <div style={{ background: 'var(--ink-deep)', borderRadius: 16, padding: 'clamp(36px,5vw,56px)', textAlign: 'center' }}>
      <h2 style={{ ...h2, color: '#F7F6F2', margin: '0 auto', maxWidth: 640 }}>{heading}</h2>
      <p style={{ ...lede, color: 'var(--on-dark-soft)', margin: '16px auto 0', maxWidth: 540 }}>{sub}</p>
      <div style={{ marginTop: 30 }}>
        <Link
          href={TRIAL_HREF}
          className="cr-cta-light"
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-body), sans-serif',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--ink-deep)',
            background: 'var(--surface)',
            padding: '14px 30px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          Start your free trial <span className="cr-cta-arrow">→</span>
        </Link>
        <div style={{ ...eyebrow, color: 'var(--muted-dark)', marginTop: 16, letterSpacing: '0.06em' }}>
          14 days free · cancel anytime
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div style={{ background: 'var(--page)', color: 'var(--ink)', minHeight: '100vh', overflowX: 'hidden' }}>
      <PublicNav active="/how-it-works" />

      {/* Hero */}
      <header style={{ ...INNER, padding: '84px 40px 44px' }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ ...eyebrow, marginBottom: 22 }}>How it works</div>
          <h1
            style={{
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(34px,5.5vw,58px)',
              lineHeight: 1.04,
              letterSpacing: '-0.03em',
              color: 'var(--ink)',
              textWrap: 'balance',
              margin: 0,
            }}
          >
            Every winning hotel post, measured against its own account.
          </h1>
          <p style={{ ...lede, margin: '24px 0 0', maxWidth: 620 }}>
            Content Radar watches the world’s best luxury hotels on Instagram and surfaces the posts
            that genuinely outperform — not the ones with the most followers behind them. Here’s exactly
            how it decides what to show you.
          </p>
        </div>
      </header>

      {/* The core idea */}
      <section style={{ ...INNER, padding: '32px 40px' }}>
        <div style={{ ...cardStyle, padding: 'clamp(32px,4vw,44px)' }}>
          <div style={{ ...eyebrow, marginBottom: 16 }}>The core idea</div>
          <h2 style={{ ...h2, maxWidth: 720 }}>
            A post is a “breakout” when it beats its own hotel’s average by 2× or more.
          </h2>
          <p style={{ ...lede, margin: '20px 0 0', maxWidth: 720 }}>
            We work out each hotel’s normal engagement — the median likes and comments across its last
            30 posts — then flag every post that clears twice that number. Because each post is judged
            against its <em>own</em> account, a 40-room boutique’s standout counts every bit as much as
            a global flagship’s. It’s a like-for-like signal of what’s actually resonating, with the
            follower-count advantage stripped out.
          </p>
        </div>
      </section>

      {/* What you get — the four things */}
      <section style={{ ...INNER, padding: '40px 40px 8px' }}>
        <div style={{ ...eyebrow, marginBottom: 14 }}>What you get</div>
        <h2 style={{ ...h2, maxWidth: 640, marginBottom: 28 }}>Four ways to read what’s working.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          <Step n="1" title="The breakout feed">
            Every post that beat its hotel’s average by 2× or more, ranked best-first by exactly how far
            it outperformed. No cherry-picking and no exceptions — you see the real order, with the live
            numbers and a link straight to the post on Instagram.
          </Step>
          <Step n="2" title="The “why it worked” read">
            Each breakout comes with a short, plain-English read on what likely drove it, plus tags for
            the format and theme — so you’re not just seeing that a post worked, but getting a view on why.
          </Step>
          <Step n="3" title="What’s working — the patterns">
            Zoom out from single posts to the trends across the whole portfolio: which formats, caption
            lengths, days of the week and times of day are pulling the most engagement right now.
          </Step>
          <Step n="4" title="The hotel leaderboard">
            Every tracked hotel ranked by true engagement rate — the average across its last 30 posts,
            not raw follower count. Search by name or filter by region to find the peers worth watching.
          </Step>
        </div>
      </section>

      {/* Time windows */}
      <section style={{ ...INNER, padding: '40px 40px' }}>
        <div style={{ ...cardStyle, padding: 'clamp(32px,4vw,44px)' }}>
          <div style={{ ...eyebrow, marginBottom: 16 }}>Choose your window</div>
          <h2 style={{ ...h2, maxWidth: 680 }}>This week’s signal, or a deeper well of proven ideas.</h2>
          <p style={{ ...lede, margin: '20px 0 0', maxWidth: 700 }}>
            The breakout feed has a simple toggle — <strong>Last 7 days</strong>,{' '}
            <strong>Last 30 days</strong>, or <strong>All time</strong>. Start on 7 days for a pulse on
            the week just gone; widen to 30 days or all time when you want the biggest possible library
            of ideas that have already proven themselves. It’s refreshed every week, so it never runs dry.
          </p>
        </div>
      </section>

      {/* Honesty / what it's built on */}
      <section style={{ ...INNER, padding: '8px 40px 48px' }}>
        <div style={{ maxWidth: 720 }}>
          <div style={{ ...eyebrow, marginBottom: 14 }}>What it’s built on</div>
          <h2 style={{ ...h2 }}>Public data, measured honestly.</h2>
          <p style={{ ...lede, margin: '18px 0 0' }}>
            Content Radar reads only what’s public on Instagram: followers, likes, comments, captions,
            post types and dates. We don’t use reach, impressions, saves or shares — those are private to
            each account, so we never pretend to have them. Everything you see is a fair, like-for-like
            read of public performance. Instagram is live today, with more channels on the way.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ ...INNER, padding: '0 40px 8px' }}>
        <TrialCta
          heading="See this week’s breakouts for yourself."
          sub="Start a 14-day free trial and get the full dashboard — the breakout feed, the patterns, and the leaderboard."
        />
      </section>

      <PublicFooter />
    </div>
  );
}

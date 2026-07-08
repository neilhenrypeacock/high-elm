import Link from 'next/link';
import { PublicNav, PublicFooter } from '@/components/PublicChrome';
import { TRIAL_HREF } from '@/lib/links';

export const metadata = {
  title: 'Content Radar — About',
  description:
    'Content Radar is powered by High Elm Studio, a boutique UK creative agency working across content and AI systems for luxury brands.',
};

const INNER: React.CSSProperties = { maxWidth: 820, margin: '0 auto', padding: '0 40px' };

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-label), sans-serif',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--signal-deep)',
};

const para: React.CSSProperties = {
  fontSize: 'clamp(16px,1.9vw,18px)',
  lineHeight: 1.75,
  color: 'var(--body-soft)',
};

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--page)', color: 'var(--ink)', minHeight: '100vh', overflowX: 'hidden' }}>
      <PublicNav active="/about" />

      <header style={{ ...INNER, padding: '84px 40px 40px' }}>
        <div style={{ ...eyebrow, marginBottom: 22 }}>About</div>
        <h1
          style={{
            fontFamily: 'var(--font-body), sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(34px,5.5vw,56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--ink)',
            textWrap: 'balance',
            margin: 0,
          }}
        >
          Built by people who work in luxury content every day.
        </h1>
      </header>

      <section style={{ ...INNER, padding: '8px 40px 40px' }}>
        <p style={{ ...para, marginBottom: 22 }}>
          Content Radar is powered by <strong>High Elm Studio</strong>, a boutique UK creative agency
          working across content and AI systems for luxury brands. We spend our days helping hospitality
          and lifestyle names show up well online — which means we live with the same question our
          members do: <em>what’s actually working right now?</em>
        </p>
        <p style={{ ...para, marginBottom: 22 }}>
          We built Content Radar because the honest answer was usually a guess. The best ideas were
          scattered across hundreds of accounts, and there was no fair way to compare a boutique’s
          quiet triumph with a flagship’s viral moment. So we made one: every post measured against its
          own hotel, the real winners ranked in front of you, refreshed every week.
        </p>
        <p style={{ ...para, margin: 0 }}>
          It’s a simple promise — never stare at a blank content calendar again — backed by real data
          from the world’s best luxury hotels.
        </p>
      </section>

      {/* Closing CTA */}
      <section style={{ ...INNER, padding: '20px 40px 8px' }}>
        <div style={{ background: 'var(--ink-deep)', borderRadius: 16, padding: 'clamp(36px,5vw,52px)', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(24px,3.2vw,32px)',
              lineHeight: 1.12,
              letterSpacing: '-0.02em',
              color: '#F7F6F2',
              margin: '0 auto',
              maxWidth: 560,
              textWrap: 'balance',
            }}
          >
            Put proven ideas in front of you, every week.
          </h2>
          <div style={{ marginTop: 28 }}>
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
      </section>

      <PublicFooter />
    </div>
  );
}

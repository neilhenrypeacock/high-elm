import type { ReactNode } from 'react';
import { PublicNav, PublicFooter } from './PublicChrome';

// Shared shell + prose primitives for the long-form public legal pages
// (/privacy, /terms). Same PublicChrome nav/footer as /how-it-works and /about,
// with a narrow, calm reading column on the site's design tokens — no new
// colours or decoration. Keeping the prose styling here (not duplicated in each
// page) means the two legal pages stay identical and there's nothing to drift.

const INNER: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '0 40px' };

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-label), sans-serif',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--signal-deep)',
};

export function LegalDoc({
  eyebrow: label,
  title,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div style={{ background: 'var(--page)', color: 'var(--ink)', minHeight: '100vh', overflowX: 'hidden' }}>
      <PublicNav />

      <header style={{ ...INNER, padding: '84px 40px 8px' }}>
        <div style={{ ...eyebrow, marginBottom: 20 }}>{label}</div>
        <h1
          style={{
            fontFamily: 'var(--font-body), sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(32px,4.6vw,48px)',
            lineHeight: 1.06,
            letterSpacing: '-0.03em',
            color: 'var(--ink)',
            textWrap: 'balance',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-label), sans-serif',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            margin: '18px 0 0',
          }}
        >
          {lastUpdated}
        </p>
      </header>

      <section style={{ ...INNER, padding: '20px 40px 48px' }}>
        <article
          style={{
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: 16.5,
            lineHeight: 1.75,
            color: 'var(--body-soft)',
          }}
        >
          {children}
        </article>
      </section>

      <PublicFooter />
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-body), sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(20px,2.4vw,24px)',
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
        color: 'var(--ink)',
        margin: '40px 0 14px',
        paddingTop: 30,
        borderTop: '1px solid var(--line-soft)',
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: '0 0 18px' }}>{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul style={{ margin: '0 0 18px', paddingLeft: 20, display: 'grid', gap: 9 }}>{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return <li style={{ lineHeight: 1.7, paddingLeft: 4 }}>{children}</li>;
}

// Emphasis that stays legible on the muted body colour.
export function B({ children }: { children: ReactNode }) {
  return <strong style={{ color: 'var(--body-strong)', fontWeight: 700 }}>{children}</strong>;
}

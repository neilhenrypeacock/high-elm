import Link from 'next/link';
import Lockup from './Lockup';
import MarkSvg from './MarkSvg';
import { TRIAL_HREF, LOGIN_HREF } from '@/lib/links';

// Shared chrome for the public/marketing content pages (How It Works, About).
// Matches the Landing page's sticky sand nav + dark footer, but as reusable
// server components so the new pages stay in the same visual language. The
// Landing page keeps its own inline nav/footer — this does not touch it.

const INNER: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 40px' };

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
];

const eyebrowLink: React.CSSProperties = {
  fontFamily: 'var(--font-label), sans-serif',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

export function PublicNav({ active }: { active?: '/how-it-works' | '/about' }) {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(10px)',
        background: 'rgba(231,227,217,0.82)',
        borderBottom: '1px solid var(--line-rule)',
      }}
    >
      <div
        style={{
          ...INNER,
          padding: '16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <Link href="/" aria-label="Content Radar home" style={{ display: 'inline-flex', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <MarkSvg size={26} color="#262420" />
            <span
              style={{
                fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}
            >
              content radar
            </span>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div className="cr-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="cr-link"
                style={{
                  ...eyebrowLink,
                  color: active === l.href ? 'var(--signal-deep)' : 'var(--muted)',
                }}
              >
                {l.label}
              </Link>
            ))}
            <Link href={LOGIN_HREF} className="cr-link" style={{ ...eyebrowLink, color: 'var(--muted)' }}>
              Log in
            </Link>
          </div>
          <Link
            href={TRIAL_HREF}
            className="cr-navcta"
            style={{
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--surface)',
              background: 'var(--ink-deep)',
              padding: '11px 22px',
              borderRadius: 10,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  );
}

const footerLegalText: React.CSSProperties = {
  fontFamily: 'var(--font-body), sans-serif',
  fontSize: 12.5,
  lineHeight: 1.7,
  color: 'var(--on-dark-soft)',
  margin: 0,
  maxWidth: 760,
};

export function PublicFooter() {
  // The one date it's fine to compute — the copyright year.
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--ink-deep)', marginTop: 80 }}>
      <div
        style={{
          ...INNER,
          paddingTop: 48,
          paddingBottom: 52,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Brand + primary links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <Lockup variant="primary" size={30} onDark />
          <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
            <Link href="/how-it-works" className="cr-footlink" style={{ ...eyebrowLink, color: 'var(--muted-dark)' }}>
              How it works
            </Link>
            <Link href="/about" className="cr-footlink" style={{ ...eyebrowLink, color: 'var(--muted-dark)' }}>
              About
            </Link>
            <Link href="/privacy" className="cr-footlink" style={{ ...eyebrowLink, color: 'var(--muted-dark)' }}>
              Privacy Policy
            </Link>
            <Link href="/terms" className="cr-footlink" style={{ ...eyebrowLink, color: 'var(--muted-dark)' }}>
              Terms of Service
            </Link>
            <Link href={LOGIN_HREF} className="cr-footlink" style={{ ...eyebrowLink, color: 'var(--muted-dark)' }}>
              Log in
            </Link>
          </div>
        </div>

        {/* Single hairline above the quiet legal block */}
        <div style={{ height: 1, background: 'var(--line-dark)' }} />

        {/* Company legal identity, independence, contact + copyright */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={footerLegalText}>
            Hotel Content Radar is a product of High Elm Productions Ltd. Registered in England and Wales, company number 15336186. Registered office: 6 The Fairland, Hingham, Norfolk NR9 4HN.
          </p>
          <p style={{ ...footerLegalText, fontStyle: 'italic', color: 'var(--muted-dark)' }}>
            Content Radar is independent and is not affiliated with, endorsed by, or sponsored by
            Instagram, Meta, Forbes, Condé Nast, Michelin, or any of the hotels, publications, or
            rating organisations it references.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 4,
            }}
          >
            <span style={{ ...footerLegalText, fontSize: 12, color: 'var(--muted-dark)' }}>
              © {year} High Elm Productions Ltd.
            </span>
            <span style={{ ...footerLegalText, fontSize: 12, color: 'var(--muted-dark)' }}>
              Contact neil@highelmstudio.com
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

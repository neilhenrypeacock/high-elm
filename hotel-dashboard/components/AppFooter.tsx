import Link from 'next/link';
import Lockup from './Lockup';

// Shared dark footer for the gated/account area and the standalone auth pages
// (login, subscribe, start-trial). Mirrors the marketing PublicFooter so the
// whole product carries one consistent footer. `note` optionally shows a
// right-aligned mono caption (e.g. the dashboard's "Updated weekly · <date>").

const INNER: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 40px' };
const LABEL = "var(--font-label), 'Hanken Grotesk', sans-serif";

const footLink: React.CSSProperties = {
  fontFamily: 'var(--font-label), sans-serif',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  color: 'var(--muted-dark)',
};

export default function AppFooter({ note }: { note?: string }) {
  return (
    <footer style={{ background: 'var(--ink-deep)', marginTop: 60 }}>
      <div
        style={{
          ...INNER,
          paddingTop: 46,
          paddingBottom: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
        }}
      >
        <Lockup variant="primary" size={24} onDark endorsementSize={9} endorsementWeight={600} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
          <Link href="/how-it-works" className="cr-footlink" style={footLink}>
            How it works
          </Link>
          <Link href="/about" className="cr-footlink" style={footLink}>
            About
          </Link>
          {note && (
            <span
              style={{
                fontFamily: LABEL,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--muted-dark)',
              }}
            >
              {note}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

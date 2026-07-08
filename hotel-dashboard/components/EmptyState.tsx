import Link from 'next/link';

// Branded empty-state block for the placeholder pages (Saved, Watchlist). Shared
// so both read as intentional, finished empty states rather than broken pages.
export default function EmptyState({
  icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: '56px 40px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto',
          borderRadius: '50%',
          background: 'var(--top3-tint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-body), sans-serif',
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          margin: '20px 0 0',
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--body-soft)', margin: '12px auto 0', maxWidth: 420 }}>
        {body}
      </p>
      <div style={{ marginTop: 24 }}>
        <Link
          href={ctaHref}
          className="cr-lift"
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            color: '#F7F6F2',
            background: 'var(--ink)',
            borderRadius: 10,
            padding: '12px 26px',
          }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

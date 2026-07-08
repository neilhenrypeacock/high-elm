// Standard content frame for gated account pages (profile, settings, saved,
// watchlist) rendered inside AppShell. Keeps their headers + width consistent.
export default function AccountFrame({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 40px 96px' }}>
      <div
        style={{
          fontFamily: 'var(--font-label), sans-serif',
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--signal-deep)',
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-body), sans-serif',
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          margin: '12px 0 0',
        }}
      >
        {title}
      </h1>
      {sub && (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--body-soft)', margin: '12px 0 0', maxWidth: 620 }}>
          {sub}
        </p>
      )}
      <div style={{ marginTop: 36 }}>{children}</div>
    </main>
  );
}

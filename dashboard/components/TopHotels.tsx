import type { TopHotelRow } from '@/lib/data';

// Rank 1 (highest ER) → sage-600 (darkest); rank 5 → sage-200 (lightest).
const SAGE_RAMP = ['var(--sage-600)','var(--sage-500)','var(--sage-400)','var(--sage-300)','var(--sage-200)'];
function barColor(rank: number): string {
  return SAGE_RAMP[Math.min(rank - 1, SAGE_RAMP.length - 1)] ?? 'var(--sage-400)';
}

export default function TopHotels({ hotels }: { hotels: TopHotelRow[] }) {
  if (!hotels.length) return null;

  const maxEr = hotels[0].er_pct; // already sorted desc

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono), monospace',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          color: 'var(--faint)',
          marginBottom: 16,
        }}
      >
        Top hotels this week
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {hotels.map(h => {
          const barW = maxEr > 0 ? (h.er_pct / maxEr) * 100 : 0;
          const color = barColor(h.rank);
          return (
            <div key={h.rank}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono), monospace',
                      fontWeight: 500,
                      fontSize: 11,
                      color: 'var(--faint)',
                      flexShrink: 0,
                      width: 16,
                    }}
                  >
                    {h.rank}
                  </span>
                  <a
                    href={`https://www.instagram.com/${h.instagram_handle}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ink)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--signal-deep)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
                  >
                    {h.name}
                  </a>
                  {h.country && (
                    <span style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>
                      {h.country}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontWeight: 500,
                    fontSize: 12,
                    color,
                    flexShrink: 0,
                  }}
                >
                  {h.er_pct.toFixed(2)}%
                </span>
              </div>
              <div
                style={{
                  height: 3,
                  background: 'var(--line)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${barW}%`,
                    background: color,
                    borderRadius: 2,
                    transition: 'width 400ms ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 14, fontSize: 11, color: 'var(--faint)', lineHeight: 1.5 }}>
        These hotels have had the highest average engagement rate across their posts in the last 7 days. Ranked from highest to lowest — hotels with 1,000+ followers only.
      </p>
    </div>
  );
}

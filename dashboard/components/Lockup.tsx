import MarkSvg from './MarkSvg';

// Content Radar brand lockup — proportions locked in the logo component spec:
// mark = 0.724×, gap = 0.207×, endorsement = 0.172× of the wordmark size,
// endorsement right-flush under the final "r" of "radar".
// variant="secondary" = mark + wordmark
// variant="primary"   = mark + wordmark + "powered by High Elm Studio"

interface LockupProps {
  variant?: 'primary' | 'secondary';
  size?: number; // wordmark font-size in px (default 28)
  onDark?: boolean;
}

export default function Lockup({ variant = 'secondary', size = 28, onDark = false }: LockupProps) {
  const wm = size;
  const markSize = wm * 0.724;
  const gap = wm * 0.207;
  const endoSize = wm * 0.172;
  const endoGap = wm * 0.03;

  const inkColor = onDark ? '#F7F6F2' : '#262420';
  const mutedColor = onDark ? '#8C867B' : '#9A8F7E';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
      {/* mark + wordmark row */}
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        <MarkSvg size={markSize} color={inkColor} />
        <span
          style={{
            font: `800 ${wm}px/0.86 var(--font-display, 'Baloo 2', sans-serif)`,
            letterSpacing: '-0.035em',
            whiteSpace: 'nowrap',
            color: inkColor,
          }}
        >
          content radar
        </span>
      </div>

      {/* endorsement line (primary only) */}
      {variant === 'primary' && (
        <div
          style={{
            marginTop: endoGap,
            textAlign: 'right',
            font: `400 ${endoSize}px/1 var(--font-label, 'Space Mono', monospace)`,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: mutedColor,
          }}
        >
          powered by High Elm Studio
        </div>
      )}
    </div>
  );
}

import MarkSvg from './MarkSvg';

// Content Radar brand lockup — implements the identity spec exactly.
// variant="secondary" = mark + wordmark (nav use)
// variant="primary"   = mark + wordmark + "powered by High Elm Studio" (footer use)

interface LockupProps {
  variant?: 'primary' | 'secondary';
  size?: number; // wordmark font-size in px (default 28)
  onDark?: boolean;
}

export default function Lockup({ variant = 'secondary', size = 28, onDark = false }: LockupProps) {
  const wm = size;
  const markSize = wm * 0.72;
  const gap = wm * 0.20;
  const endoSize = wm * 0.17;
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
            font: `800 ${wm}px/0.86 var(--font-wordmark, 'Baloo 2', sans-serif)`,
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
            font: `400 ${endoSize}px/1 var(--font-mono, 'JetBrains Mono', monospace)`,
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

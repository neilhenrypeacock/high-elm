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
  /** Override the endorsement font-size (px). Defaults to the locked 0.172× ratio.
   *  The footer uses a larger, bolder endorsement for legibility at small scale. */
  endorsementSize?: number;
  endorsementWeight?: number;
}

export default function Lockup({
  variant = 'secondary',
  size = 28,
  onDark = false,
  endorsementSize,
  endorsementWeight = 400,
}: LockupProps) {
  const wm = size;
  const markSize = wm * 0.724;
  const gap = wm * 0.207;
  const endoSize = endorsementSize ?? wm * 0.172;
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
            // Longhand, NOT the `font` shorthand: the shorthand silently fails to
            // parse in Safari when the family is a var(), which drops font-size and
            // leaves the wordmark at the inherited size.
            fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: wm,
            lineHeight: 0.86,
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
            // Longhand, NOT the `font` shorthand — see the wordmark above. In Safari
            // the shorthand dropped font-size, so this line inherited ~14px and blew
            // out of place under the wordmark.
            fontFamily: "var(--font-label), 'Hanken Grotesk', sans-serif",
            fontWeight: endorsementWeight,
            fontSize: endoSize,
            lineHeight: 1,
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

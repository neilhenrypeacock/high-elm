interface MarkSvgProps {
  size: number;
  color: string; // ring stroke colour (centre teal is always #5B9BAA)
}

export default function MarkSvg({ size, color }: MarkSvgProps) {
  return (
    <svg
      viewBox="0 0 72 72"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx={36} cy={36} r={34} stroke={color} strokeWidth={3} opacity={0.16} />
      <circle cx={36} cy={36} r={27} stroke={color} strokeWidth={3} opacity={0.32} />
      <circle cx={36} cy={36} r={20} stroke={color} strokeWidth={3} opacity={0.52} />
      <circle cx={36} cy={36} r={13} stroke={color} strokeWidth={3} opacity={0.78} />
      <circle cx={36} cy={36} r={7} fill="#5B9BAA" />
    </svg>
  );
}

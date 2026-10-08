import { IllustrationSvg, type IllustrationProps } from './svg';

const FACES = [
  { x: 40, y: 44, tone: 'fill-track-ai-tint', head: 'fill-track-ai' },
  { x: 124, y: 44, tone: 'fill-track-marketing-tint', head: 'fill-track-marketing' },
  { x: 40, y: 104, tone: 'fill-passed-tint', head: 'fill-passed' },
  { x: 124, y: 104, tone: 'fill-active-tint', head: 'fill-active' },
];

/** A video call grid with a "live" dot: classes taught live, together. */
export function LiveClass({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <rect x="26" y="30" width="188" height="136" rx="16" className="fill-background" />
      {FACES.map(({ x, y, tone, head }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="76" height="52" rx="10" className={tone} />
          <circle cx={x + 38} cy={y + 22} r="10" className={head} />
          <path d={`M${x + 20} ${y + 52} a18 14 0 0 1 36 0`} className={head} />
        </g>
      ))}
      <rect x="164" y="14" width="56" height="26" rx="13" className="fill-failed" />
      <circle cx="180" cy="27" r="4" className="fill-background" stroke="none" />
      <text
        x="200"
        y="32"
        textAnchor="middle"
        className="fill-background"
        stroke="none"
        fontSize="12"
        fontWeight="800"
      >
        LIVE
      </text>
    </IllustrationSvg>
  );
}

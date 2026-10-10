import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** A clipboard of ticked answers with a score badge: progress proven by tests. */
export function TestCheck({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <rect x="58" y="24" width="112" height="144" rx="14" className="fill-background" />
      <rect x="90" y="16" width="48" height="18" rx="6" className="fill-line-strong" />
      {[56, 88, 120].map((y, i) => (
        <g key={y}>
          <rect
            x="74"
            y={y}
            width="20"
            height="20"
            rx="6"
            className={i < 2 ? 'fill-passed' : 'fill-background'}
          />
          {i < 2 && (
            <path
              d={`M79 ${y + 10} l4 4 l7 -8`}
              fill="none"
              className="stroke-background"
              strokeWidth={3}
            />
          )}
          <line x1="104" y1={y + 10} x2={i === 1 ? 140 : 152} y2={y + 10} />
        </g>
      ))}
      <circle cx="176" cy="130" r="30" className="fill-track-ai" />
      <text
        x="176"
        y="137"
        textAnchor="middle"
        className="fill-background"
        stroke="none"
        fontSize="20"
        fontWeight="800"
      >
        70%
      </text>
      <Sparkle x={206} y={86} r={12} className="fill-track-marketing" />
      <Sparkle x={38} y={60} r={9} className="fill-active" />
    </IllustrationSvg>
  );
}

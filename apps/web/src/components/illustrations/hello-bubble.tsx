import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** A big speech bubble saying "Mirë se vini!": every class is taught in Albanian. */
export function HelloBubble({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <path
        d="M36 34 h168 a18 18 0 0 1 18 18 v58 a18 18 0 0 1 -18 18 h-104 l-30 26 v-26 h-34 a18 18 0 0 1 -18 -18 v-58 a18 18 0 0 1 18 -18 z"
        className="fill-track-marketing"
      />
      <text
        x="120"
        y="92"
        textAnchor="middle"
        className="fill-ink"
        stroke="none"
        fontSize="26"
        fontWeight="800"
      >
        Mirë se vini!
      </text>
      <circle cx="196" cy="150" r="14" className="fill-track-ai" />
      <circle cx="222" cy="160" r="7" className="fill-track-ai-tint" />
      <Sparkle x={26} y={26} r={12} className="fill-active" />
    </IllustrationSvg>
  );
}

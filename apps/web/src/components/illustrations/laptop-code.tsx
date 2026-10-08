import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** A laptop with code brackets on screen: learning to code with AI. */
export function LaptopCode({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <rect x="46" y="28" width="148" height="100" rx="12" className="fill-ink" />
      <rect x="56" y="38" width="128" height="80" rx="6" className="fill-track-ai-tint" />
      <path
        d="M100 62 l-16 16 l16 16"
        fill="none"
        className="stroke-track-ai-ink"
        strokeWidth={5}
      />
      <path
        d="M140 62 l16 16 l-16 16"
        fill="none"
        className="stroke-track-ai-ink"
        strokeWidth={5}
      />
      <line x1="128" y1="58" x2="112" y2="98" className="stroke-track-marketing" strokeWidth={5} />
      <path
        d="M24 136 h192 l-10 16 a6 6 0 0 1 -5 3 h-162 a6 6 0 0 1 -5 -3 z"
        className="fill-background"
      />
      <rect x="104" y="136" width="32" height="6" rx="3" className="fill-line-strong" />
      <Sparkle x={214} y={40} r={13} className="fill-track-marketing" />
      <Sparkle x={24} y={64} r={9} className="fill-track-ai" />
    </IllustrationSvg>
  );
}

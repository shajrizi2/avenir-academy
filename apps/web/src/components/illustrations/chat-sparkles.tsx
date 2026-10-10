import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** A question bubble and an answer bubble, with sparkles: talking to an AI assistant. */
export function ChatSparkles({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      {/* Question */}
      <path
        d="M24 30 h120 a14 14 0 0 1 14 14 v36 a14 14 0 0 1 -14 14 h-88 l-18 16 v-16 h-14 a14 14 0 0 1 -14 -14 v-36 a14 14 0 0 1 14 -14 z"
        className="fill-background"
      />
      <line x1="40" y1="54" x2="128" y2="54" />
      <line x1="40" y1="70" x2="104" y2="70" />
      {/* Answer */}
      <path
        d="M96 92 h112 a14 14 0 0 1 14 14 v42 a14 14 0 0 1 -14 14 h-14 v16 l-18 -16 h-80 a14 14 0 0 1 -14 -14 v-42 a14 14 0 0 1 14 -14 z"
        className="fill-track-ai"
      />
      <line x1="112" y1="116" x2="200" y2="116" className="stroke-background" strokeWidth={3} />
      <line x1="112" y1="132" x2="186" y2="132" className="stroke-background" strokeWidth={3} />
      <line x1="112" y1="148" x2="160" y2="148" className="stroke-background" strokeWidth={3} />
      <Sparkle x={196} y={42} r={16} className="fill-track-marketing" />
      <Sparkle x={222} y={70} r={8} className="fill-active" />
      <Sparkle x={34} y={142} r={10} className="fill-track-ai-tint" />
    </IllustrationSvg>
  );
}

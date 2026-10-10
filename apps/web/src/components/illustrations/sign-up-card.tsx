import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** A short sign-up form with a big button and a check mark: registering takes a minute. */
export function SignUpCard({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <rect x="48" y="20" width="144" height="148" rx="16" className="fill-background" />
      <circle cx="120" cy="50" r="16" className="fill-track-marketing" />
      <rect x="66" y="78" width="108" height="16" rx="6" className="fill-soft" />
      <rect x="66" y="102" width="108" height="16" rx="6" className="fill-soft" />
      <rect x="66" y="132" width="108" height="20" rx="8" className="fill-ink" />
      <line x1="104" y1="142" x2="136" y2="142" className="stroke-background" strokeWidth={3} />
      <circle cx="190" cy="136" r="22" className="fill-passed" />
      <path d="M180 136 l7 7 l13 -14" fill="none" className="stroke-background" strokeWidth={4} />
      <Sparkle x={40} y={44} r={12} className="fill-track-ai" />
      <Sparkle x={212} y={34} r={8} className="fill-active" />
    </IllustrationSvg>
  );
}

import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** A bank card next to a bank building: pay by card or by transfer. */
export function CardPayment({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <rect x="28" y="56" width="128" height="80" rx="12" className="fill-track-ai" />
      <rect x="28" y="74" width="128" height="16" className="fill-ink" />
      <rect x="42" y="104" width="48" height="10" rx="4" className="fill-background" />
      <rect x="42" y="118" width="28" height="8" rx="4" className="fill-background" />
      <circle cx="136" cy="116" r="9" className="fill-track-marketing" />
      <circle cx="124" cy="116" r="9" className="fill-active" />
      <path d="M160 92 l28 -18 l28 18 Z" className="fill-track-marketing-tint" />
      <rect x="160" y="92" width="56" height="44" rx="4" className="fill-background" />
      <rect x="168" y="100" width="8" height="30" rx="2" className="fill-soft" />
      <rect x="184" y="100" width="8" height="30" rx="2" className="fill-soft" />
      <rect x="200" y="100" width="8" height="30" rx="2" className="fill-soft" />
      <rect x="156" y="136" width="64" height="8" rx="3" className="fill-ink" />
      <circle cx="196" cy="48" r="20" className="fill-passed" />
      <path d="M186 48 l7 7 l13 -14" fill="none" className="stroke-background" strokeWidth={4} />
      <Sparkle x={24} y={40} r={10} className="fill-active" />
    </IllustrationSvg>
  );
}

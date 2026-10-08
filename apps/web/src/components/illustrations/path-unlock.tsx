import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** A winding path of stepping stones that ends at an open lock: one module at a time. */
export function PathUnlock({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <path
        d="M24 150 C70 150 60 104 104 104 S150 60 186 64"
        fill="none"
        className="stroke-line-strong"
        strokeWidth={10}
      />
      <path
        d="M24 150 C70 150 60 104 104 104"
        fill="none"
        className="stroke-passed"
        strokeWidth={10}
      />
      <circle cx="30" cy="150" r="12" className="fill-passed" />
      <path d="M24 150 l4 4 l8 -9" fill="none" className="stroke-background" strokeWidth={3} />
      <circle cx="72" cy="128" r="12" className="fill-passed" />
      <path d="M66 128 l4 4 l8 -9" fill="none" className="stroke-background" strokeWidth={3} />
      <circle cx="112" cy="102" r="13" className="fill-active" />
      <circle cx="152" cy="74" r="12" className="fill-locked-tint" />
      {/* Open padlock */}
      <path
        d="M180 58 v-14 a16 16 0 0 1 32 0 v2"
        fill="none"
        strokeWidth={5}
        className="stroke-ink"
      />
      <rect x="172" y="56" width="44" height="38" rx="8" className="fill-track-ai" />
      <circle cx="194" cy="72" r="5" className="fill-background" />
      <line x1="194" y1="76" x2="194" y2="84" className="stroke-background" strokeWidth={3} />
      <Sparkle x={222} y={30} r={12} className="fill-track-marketing" />
      <Sparkle x={150} y={36} r={7} className="fill-active" />
    </IllustrationSvg>
  );
}

import { IllustrationSvg, type IllustrationProps } from './svg';

/** A megaphone next to a rising bar chart: digital marketing that gets results. */
export function MegaphoneChart({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <rect x="14" y="20" width="212" height="148" rx="24" className="fill-track-marketing-tint" />
      {/* Chart */}
      <line x1="128" y1="146" x2="214" y2="146" />
      <rect x="134" y="112" width="18" height="34" rx="4" className="fill-track-ai-tint" />
      <rect x="160" y="92" width="18" height="54" rx="4" className="fill-track-ai" />
      <rect x="186" y="62" width="18" height="84" rx="4" className="fill-track-marketing" />
      <path d="M136 92 L166 70 L184 78 L208 44" fill="none" />
      <path d="M196 42 L210 42 L210 56" fill="none" />
      {/* Megaphone */}
      <path
        d="M34 82 h16 l52 -30 v76 l-52 -30 h-16 a6 6 0 0 1 -6 -6 v-4 a6 6 0 0 1 6 -6 z"
        className="fill-track-marketing"
      />
      <rect x="98" y="48" width="10" height="84" rx="5" className="fill-background" />
      <path
        d="M44 98 l8 34 a6 6 0 0 0 6 4 h6 a4 4 0 0 0 4 -5 l-7 -27"
        className="fill-background"
      />
      <path d="M116 70 q10 20 0 40" fill="none" />
      <path d="M124 60 q18 30 0 60" fill="none" opacity={0.5} />
    </IllustrationSvg>
  );
}

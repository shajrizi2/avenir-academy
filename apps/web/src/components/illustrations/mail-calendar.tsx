import { IllustrationSvg, type IllustrationProps, Sparkle } from './svg';

/** An envelope carrying a calendar page: the timetable arrives by email. */
export function MailCalendar({ className }: IllustrationProps) {
  return (
    <IllustrationSvg className={className}>
      <rect x="36" y="52" width="140" height="96" rx="12" className="fill-track-marketing-tint" />
      <path d="M36 64 l70 48 l70 -48" fill="none" />
      <rect x="128" y="24" width="84" height="88" rx="10" className="fill-background" />
      <rect x="128" y="24" width="84" height="22" rx="10" className="fill-track-ai" />
      <rect x="128" y="36" width="84" height="10" className="fill-track-ai" />
      <line x1="146" y1="18" x2="146" y2="34" strokeWidth={3} />
      <line x1="194" y1="18" x2="194" y2="34" strokeWidth={3} />
      <rect x="140" y="56" width="14" height="12" rx="3" className="fill-soft" />
      <rect x="162" y="56" width="14" height="12" rx="3" className="fill-active" />
      <rect x="184" y="56" width="14" height="12" rx="3" className="fill-soft" />
      <rect x="140" y="76" width="14" height="12" rx="3" className="fill-active" />
      <rect x="162" y="76" width="14" height="12" rx="3" className="fill-soft" />
      <rect x="184" y="76" width="14" height="12" rx="3" className="fill-active" />
      <rect x="140" y="96" width="36" height="8" rx="3" className="fill-soft" />
      <Sparkle x={30} y={36} r={10} className="fill-track-ai" />
      <Sparkle x={222} y={132} r={8} className="fill-track-marketing" />
    </IllustrationSvg>
  );
}

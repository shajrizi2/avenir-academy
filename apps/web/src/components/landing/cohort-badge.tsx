import { getLandingMessages } from '@/i18n/server';
import { getSiteSettings } from '@/lib/landing-data';
import { DateTemplate } from './date-template';

/** "Next cohort starts <date>" pill; falls back to "Registration is open". */
export async function CohortBadge() {
  const [{ t }, settings] = await Promise.all([getLandingMessages(), getSiteSettings()]);
  const start = settings?.nextCohortStart;
  return (
    <BadgeShell>
      {start ? (
        <DateTemplate template={t.hero.badgeCohort} value={start} months={t.dates.months} />
      ) : (
        t.hero.badgeOpen
      )}
    </BadgeShell>
  );
}

export function BadgeShell({ children }: { children?: React.ReactNode }) {
  return (
    <p className="bg-accent text-accent-foreground inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-indigo-600/15 ring-inset">
      <span className="relative flex size-2" aria-hidden>
        <span className="bg-primary absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
        <span className="bg-primary relative inline-flex size-2 rounded-full" />
      </span>
      <span>{children}</span>
    </p>
  );
}

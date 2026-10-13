import { getLandingMessages } from '@/i18n/server';
import { getOpenGroups, getSiteSettings } from '@/lib/landing-data';
import { DateTemplate } from './date-template';

/** "The first group starts <date>" pill: the earliest open group, else the site setting. */
export async function CohortBadge() {
  const [{ t }, groups, settings] = await Promise.all([
    getLandingMessages(),
    getOpenGroups(),
    getSiteSettings(),
  ]);
  const start = groups.map((g) => g.startDate).sort()[0] ?? settings?.nextCohortStart;
  return (
    <BadgeShell>
      {start ? <DateTemplate template={t.hero.badgeCohort} value={start} /> : t.hero.badgeOpen}
    </BadgeShell>
  );
}

export function BadgeShell({ children }: { children?: React.ReactNode }) {
  return (
    <p className="bg-track-ai-tint text-track-ai-ink inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-1 text-sm font-bold">
      <span className="relative flex size-2" aria-hidden>
        <span className="bg-track-ai absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" />
        <span className="bg-track-ai relative inline-flex size-2 rounded-full" />
      </span>
      <span>{children}</span>
    </p>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Landmark,
  Library,
  ListOrdered,
  type LucideIcon,
  Percent,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { adminStatsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  alert?: boolean;
}

/** Headline numbers for the admin overview (GET /admin/stats). */
export function PlatformStats() {
  const { data } = useQuery(adminStatsQuery);

  const o = t.admin.overview;
  const items: StatItem[] | null = data
    ? [
        {
          label: o.enrolledStudents,
          value: String(data.approvedEnrollments),
          hint: fmt(o.studentAccounts, { count: data.students }),
          icon: GraduationCap,
        },
        {
          label: o.bankTransfers,
          value: String(data.pendingBankTransfers),
          hint: o.bankTransfersHint,
          icon: Landmark,
          alert: data.pendingBankTransfers > 0,
        },
        {
          label: o.openGroups,
          value: String(data.openGroups),
          hint: o.openGroupsHint,
          icon: Users,
        },
        {
          label: o.waitlisted,
          value: String(data.waitlisted),
          hint: o.waitlistedHint,
          icon: ListOrdered,
        },
        {
          label: o.publishedCourses,
          value: String(data.publishedCourses),
          hint: fmt(o.instructorsCount, { count: data.instructors }),
          icon: Library,
        },
        {
          label: o.liveSessions,
          value: String(data.sessionsNext7Days),
          hint: o.next7Days,
          icon: CalendarClock,
        },
        {
          label: o.openTests,
          value: String(data.openTests),
          hint: fmt(o.attempts30Days, { count: data.attemptsLast30Days }),
          icon: ClipboardCheck,
        },
        {
          label: o.passRate,
          value: data.passRateLast30Days === null ? '–' : `${data.passRateLast30Days}%`,
          hint: o.ofAttempts30Days,
          icon: Percent,
        },
        {
          label: o.outOfAttempts,
          value: String(data.failedModules),
          hint: o.resetHint,
          icon: TriangleAlert,
          alert: data.failedModules > 0,
        },
      ]
    : null;

  return (
    <section aria-labelledby="stats-title" className="space-y-4">
      <h2 id="stats-title" className="text-ink text-subheading font-extrabold">
        {t.admin.overview.platform}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items
          ? items.map(({ label, value, hint, icon: Icon, alert }) => (
              <li
                key={label}
                className={cn(
                  'rounded-card flex items-start gap-4 border p-5',
                  alert ? 'bg-failed-tint border-transparent' : 'bg-background border-line',
                )}
              >
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                    alert ? 'bg-background text-failed-ink' : 'bg-soft text-ink',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-ink-soft text-sm font-semibold">{label}</p>
                  <p className="text-ink text-heading font-extrabold">{value}</p>
                  <p className="text-ink-soft text-sm">{hint}</p>
                </div>
              </li>
            ))
          : Array.from({ length: 9 }, (_, i) => (
              <li key={i}>
                <Skeleton className="rounded-card h-32 w-full" />
              </li>
            ))}
      </ul>
    </section>
  );
}

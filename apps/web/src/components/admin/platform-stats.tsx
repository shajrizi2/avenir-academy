'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Library,
  type LucideIcon,
  Percent,
  TriangleAlert,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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

  const items: StatItem[] | null = data
    ? [
        {
          label: 'Enrolled students',
          value: String(data.approvedEnrollments),
          hint: `${data.students} student accounts`,
          icon: GraduationCap,
        },
        {
          label: 'Published courses',
          value: String(data.publishedCourses),
          hint: `${data.instructors} instructors`,
          icon: Library,
        },
        {
          label: 'Live sessions',
          value: String(data.sessionsNext7Days),
          hint: 'in the next 7 days',
          icon: CalendarClock,
        },
        {
          label: 'Tests open now',
          value: String(data.openTests),
          hint: `${data.attemptsLast30Days} attempts in 30 days`,
          icon: ClipboardCheck,
        },
        {
          label: 'Pass rate',
          value: data.passRateLast30Days === null ? '–' : `${data.passRateLast30Days}%`,
          hint: 'of attempts in 30 days',
          icon: Percent,
        },
        {
          label: 'Out of attempts',
          value: String(data.failedModules),
          hint: 'reset from a test’s results page',
          icon: TriangleAlert,
          alert: data.failedModules > 0,
        },
      ]
    : null;

  return (
    <section aria-labelledby="stats-title" className="space-y-4">
      <h2 id="stats-title" className="text-ink text-subheading font-extrabold">
        Platform
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
          : Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <Skeleton className="rounded-card h-32 w-full" />
              </li>
            ))}
      </ul>
    </section>
  );
}

import { type CourseSummary, discountPercent, formatPrice } from '@ai-academy/shared';
import { ArrowRight, CalendarDays, Layers } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/components/local-date-time';
import { Card } from '@/components/ui/card';
import { fmt, t } from '@/i18n/messages';
import { cn } from '@/lib/utils';
import { trackTheme } from './track-theme';

/** Catalog card: a track-tinted illustration band, then title, summary, facts and the price. */
export function CourseCard({ course }: { course: CourseSummary }) {
  const theme = trackTheme(course.slug);
  const discount = discountPercent(course.priceCents, course.listPriceCents);
  return (
    <Card variant="pressable" className="h-full gap-0 py-0">
      <div className={cn('flex items-center justify-center px-10 py-6', theme.tint)}>
        <theme.Illustration className="max-w-56" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h2 className="text-ink text-subheading font-extrabold">
          <Link
            href={`/courses/${course.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {course.title}
          </Link>
        </h2>
        <p className="text-ink-soft">{course.summary}</p>
        <div className="text-ink-soft mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-4" aria-hidden />
            {fmt(t.catalog.card.modules, { count: course.moduleCount })}
          </span>
          {course.startDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {fmt(t.catalog.card.starts, { date: formatDate(course.startDate, 'date') })}
            </span>
          )}
        </div>
        <p className="text-ink flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="text-subheading font-extrabold">
            {formatPrice(course.priceCents, course.currency)}
          </span>
          <span className="text-ink-soft text-sm">{t.catalog.card.perMonth}</span>
          {discount > 0 && course.listPriceCents && (
            <span className="text-ink-soft text-sm">
              <s>{formatPrice(course.listPriceCents, course.currency)}</s>
            </span>
          )}
        </p>
        <span className="text-ink inline-flex items-center gap-1 pt-1 font-bold">
          {t.catalog.card.view} <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Card>
  );
}

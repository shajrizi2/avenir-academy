import {
  discountPercent,
  formatPrice,
  GROUP_MAX_CAPACITY,
  LECTURE_HOURS_PER_MONTH,
} from '@ai-academy/shared';
import { CalendarDays, Clock, CreditCard, Tag, Users, Video } from 'lucide-react';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from '@/i18n/format';
import { getLandingMessages } from '@/i18n/server';
import { getOpenGroups, getSiteSettings, getTracks } from '@/lib/landing-data';
import { CtaLink } from './cta-link';
import { DateTemplate } from './date-template';
import { LandingSection } from './landing-section';

/**
 * The launch offer: start date, schedule, group size, price and payment options. The date
 * comes from the first open group (fallback: SiteSettings), the price from the courses.
 */
export async function Offer() {
  const { locale, t } = await getLandingMessages();
  return (
    <LandingSection
      id="offer"
      tone="soft"
      eyebrow={t.offer.eyebrow}
      title={t.offer.title}
      intro={t.offer.intro}
    >
      <div className="reveal border-ink rounded-card bg-background mx-auto max-w-3xl border-2 p-6 shadow-[0_6px_0_var(--ink)] sm:p-10">
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <OfferDetails />
        </Suspense>
        <div className="border-line mt-8 flex flex-col items-center gap-4 border-t pt-8 text-center">
          <CtaLink
            href="/courses"
            cta="offer_reserve"
            locale={locale}
            variant="chunky"
            size="xl"
            className="w-full sm:w-auto"
          >
            {t.offer.cta}
          </CtaLink>
          <p className="text-ink-soft max-w-md text-sm">{t.offer.note}</p>
        </div>
      </div>
    </LandingSection>
  );
}

async function OfferDetails() {
  const [{ t }, groups, tracks, settings] = await Promise.all([
    getLandingMessages(),
    getOpenGroups(),
    getTracks(),
    getSiteSettings(),
  ]);
  const o = t.offer;
  const firstStart = groups.map((g) => g.startDate).sort()[0] ?? settings?.nextCohortStart ?? null;
  const course = tracks?.[0] ?? null;
  const price = course ? formatPrice(course.priceCents, course.currency) : null;
  const listPrice =
    course?.listPriceCents && discountPercent(course.priceCents, course.listPriceCents) > 0
      ? formatPrice(course.listPriceCents, course.currency)
      : null;

  const rows = [
    {
      icon: CalendarDays,
      label: o.startLabel,
      value: firstStart ? <DateTemplate template="{date}" value={firstStart} /> : o.startTbd,
    },
    {
      icon: Clock,
      label: o.scheduleLabel,
      value: format(o.scheduleValue, { hours: LECTURE_HOURS_PER_MONTH }),
    },
    {
      icon: Users,
      label: o.seatsLabel,
      value: format(o.seatsValue, { count: GROUP_MAX_CAPACITY }),
    },
    {
      icon: Tag,
      label: o.priceLabel,
      value: price ? (
        <>
          {format(o.priceValue, { price })}
          {listPrice && (
            <span className="text-ink-soft ml-2 text-base font-medium">
              <s>{listPrice}</s>
            </span>
          )}
        </>
      ) : (
        o.startTbd
      ),
    },
    { icon: Video, label: o.formatLabel, value: o.formatValue },
    { icon: CreditCard, label: o.paymentLabel, value: o.paymentValue },
  ];

  return (
    <dl className="grid gap-6 sm:grid-cols-2">
      {rows.map(({ icon: Icon, label, value }) => (
        // dt/dd must be direct children of the group div, so the icon lives inside <dt>.
        <div key={label} className="relative min-h-11 pl-15">
          <dt className="text-ink-soft text-sm">
            <span className="bg-track-ai-tint text-track-ai-ink absolute top-0 left-0 flex size-11 items-center justify-center rounded-xl">
              <Icon className="size-5" aria-hidden />
            </span>
            {label}
          </dt>
          <dd className="text-ink mt-0.5 text-lg font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

import type { Locale, SiteSettings } from '@ai-academy/shared';
import { CalendarDays, Clock, Tag, Users } from 'lucide-react';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, INTL_LOCALE } from '@/i18n/format';
import type { LandingMessages } from '@/i18n/messages';
import { getLandingMessages } from '@/i18n/server';
import { getSiteSettings } from '@/lib/landing-data';
import { CtaLink } from './cta-link';
import { DateTemplate } from './date-template';
import { LandingSection } from './landing-section';

/** Next cohort and price. Values come from SiteSettings, so they change without a deploy. */
export async function Cohort() {
  const { locale, t } = await getLandingMessages();
  return (
    <LandingSection
      id="cohort"
      tone="soft"
      eyebrow={t.cohort.eyebrow}
      title={t.cohort.title}
      intro={t.cohort.intro}
    >
      <div className="reveal border-ink rounded-card bg-background mx-auto max-w-3xl border-2 p-6 shadow-[0_6px_0_var(--ink)] sm:p-10">
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <CohortDetails />
        </Suspense>
        <div className="border-line mt-8 flex flex-col items-center gap-4 border-t pt-8 text-center">
          <CtaLink
            href="/register"
            cta="cohort_reserve"
            locale={locale}
            variant="chunky"
            size="xl"
            className="w-full sm:w-auto"
          >
            {t.cohort.cta}
          </CtaLink>
          <p className="text-ink-soft max-w-md text-sm">{t.cohort.note}</p>
        </div>
      </div>
    </LandingSection>
  );
}

async function CohortDetails() {
  const [{ locale, t }, settings] = await Promise.all([getLandingMessages(), getSiteSettings()]);
  const c = t.cohort;
  const rows = [
    {
      icon: CalendarDays,
      label: c.startLabel,
      value: settings?.nextCohortStart ? (
        <DateTemplate template="{date}" value={settings.nextCohortStart} months={t.dates.months} />
      ) : (
        c.startTbd
      ),
    },
    {
      icon: Clock,
      label: c.scheduleLabel,
      value: (locale === 'sq' ? settings?.scheduleSq : settings?.scheduleEn) ?? c.tbd,
    },
    {
      icon: Users,
      label: c.seatsLabel,
      value: settings?.seatsTotal ? format(c.seatsValue, { count: settings.seatsTotal }) : c.tbd,
    },
    { icon: Tag, label: c.priceLabel, value: priceText(settings, locale, c) },
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

function priceText(
  settings: SiteSettings | null,
  locale: Locale,
  c: LandingMessages['cohort'],
): string {
  if (settings?.priceAmount == null) return c.priceContact;
  const amount = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: settings.priceCurrency,
    maximumFractionDigits: 0,
  }).format(settings.priceAmount);
  const note = locale === 'sq' ? settings.priceNoteSq : settings.priceNoteEn;
  return note ? `${amount} ${note}` : amount;
}

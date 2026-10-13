import {
  type CourseDetail,
  discountPercent,
  formatPrice,
  formatSqDate,
  formatSqSchedule,
  GROUP_MAX_CAPACITY,
  type GroupSummary,
} from '@ai-academy/shared';
import { ArrowRight, CalendarDays, Clock, Languages, Users, Video } from 'lucide-react';
import { Suspense } from 'react';
import { ModulePath } from '@/components/course/module-path';
import { trackTheme } from '@/components/course/track-theme';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from '@/i18n/format';
import type { LandingMessages } from '@/i18n/messages';
import { getLandingMessages } from '@/i18n/server';
import { getOpenGroups, getTracks } from '@/lib/landing-data';
import { localizeCourse } from '@/lib/localize';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';
import { CtaLink } from './cta-link';
import { JsonLd } from './json-ld';
import { LandingSection } from './landing-section';

export async function Tracks() {
  const { t } = await getLandingMessages();
  return (
    <LandingSection
      id="tracks"
      tone="soft"
      eyebrow={t.tracks.eyebrow}
      title={t.tracks.title}
      intro={t.tracks.intro}
    >
      <Suspense fallback={<TrackSkeletons />}>
        <TrackList />
      </Suspense>
    </LandingSection>
  );
}

async function TrackList() {
  const [{ locale, t }, loaded, groups] = await Promise.all([
    getLandingMessages(),
    getTracks(),
    getOpenGroups(),
  ]);
  const tracks = loaded?.map((track) => localizeCourse(track, locale));
  if (!tracks || tracks.length === 0) {
    return <p className="text-ink-soft text-center">{t.tracks.unavailable}</p>;
  }
  return (
    <>
      <ul className="grid gap-6 lg:grid-cols-3">
        {tracks.map((track) => (
          <li key={track.id}>
            <TrackCard
              track={track}
              group={groups.find((g) => g.course.id === track.id) ?? null}
              locale={locale}
              t={t.tracks}
            />
          </li>
        ))}
      </ul>
      <JsonLd data={coursesJsonLd(tracks, groups)} />
    </>
  );
}

interface TrackCardProps {
  track: CourseDetail;
  group: GroupSummary | null;
  locale: 'sq' | 'en';
  t: LandingMessages['tracks'];
}

/** One course: what you learn, the next group's date, schedule and real seats, the price. */
function TrackCard({ track, group, locale, t }: TrackCardProps) {
  const theme = trackTheme(track.slug);
  const price = formatPrice(track.priceCents, track.currency);
  const percent = discountPercent(track.priceCents, track.listPriceCents);
  const full = group?.seatsLeft === 0;
  return (
    <article className={cn('reveal rounded-card flex h-full flex-col p-6 sm:p-8', theme.tint)}>
      <span
        className={cn(
          'border-ink text-ink flex size-14 items-center justify-center rounded-2xl border-2 shadow-[0_3px_0_var(--ink)]',
          theme.fill,
        )}
      >
        <theme.Icon className="size-7" aria-hidden />
      </span>
      <h3 className="text-ink text-subheading mt-6 font-extrabold text-balance">{track.title}</h3>
      <p className="text-ink-soft mt-1 text-xs font-bold tracking-wide uppercase">{t.learnLabel}</p>
      <p className="text-ink mt-1">{track.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill icon={Languages}>{t.languageBadge}</Pill>
        <Pill icon={Video}>{t.liveBadge}</Pill>
      </div>

      <dl className="text-ink mt-6 space-y-2 text-sm">
        <Row icon={CalendarDays} label={t.startLabel}>
          {group ? formatSqDate(`${group.startDate}T12:00:00Z`, { weekday: true }) : t.noGroup}
        </Row>
        <Row icon={Clock} label={t.scheduleLabel}>
          {group ? formatSqSchedule(group) : '3 × 2h / javë'}
        </Row>
        <Row icon={Users} label={format(t.maxPerGroup, { count: GROUP_MAX_CAPACITY })}>
          {group ? (
            <span className={full ? 'text-failed-ink font-bold' : 'text-passed-ink font-bold'}>
              {full
                ? t.full
                : group.seatsLeft === 1
                  ? t.seatsOne
                  : format(t.seatsLeft, { count: group.seatsLeft })}
            </span>
          ) : null}
        </Row>
      </dl>

      <h4 className="sr-only">{t.modulesLabel}</h4>
      <div className="mt-6 flex-1">
        <ModulePath
          accent={theme.fill}
          steps={track.modules.map((module, i) => ({
            ...module,
            caption: `${format(t.moduleLabel, { number: module.order })} · ${
              i === 0 ? t.startHere : format(t.lockedUntil, { number: module.order - 1 })
            }`,
          }))}
        />
      </div>

      <p className="text-ink mt-8 flex flex-wrap items-baseline gap-x-2">
        <span className="text-heading font-extrabold">{price}</span>
        <span className="font-semibold">{t.perMonth}</span>
        {percent > 0 && track.listPriceCents && (
          <>
            <s className="text-ink-soft text-sm">
              {format(t.insteadOf, { price: formatPrice(track.listPriceCents, track.currency) })}
            </s>
            <span className="bg-ink text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">
              {format(t.discount, { percent })}
            </span>
          </>
        )}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <CtaLink
          href={group ? `/checkout/${group.id}` : `/courses/${track.slug}`}
          cta={`track_register_${track.slug}`}
          locale={locale}
          variant="chunky"
          size="lg"
        >
          {group && full ? t.waitlist : t.register}
          <span className="sr-only">: {track.title}</span>
        </CtaLink>
        <CtaLink
          href={`/courses/${track.slug}`}
          cta={`track_${track.slug}`}
          locale={locale}
          variant="chunky-outline"
          size="lg"
        >
          {t.viewTrack} <ArrowRight data-icon="inline-end" />
          <span className="sr-only">: {track.title}</span>
        </CtaLink>
      </div>
    </article>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="text-ink-soft mt-0.5 size-4 shrink-0" aria-hidden />
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="bg-background/70 text-ink inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

function TrackSkeletons() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="rounded-card h-[640px]" />
      ))}
    </div>
  );
}

function coursesJsonLd(tracks: CourseDetail[], groups: GroupSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: tracks.map((track, i) => {
      const group = groups.find((g) => g.course.id === track.id);
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Course',
          name: track.title,
          description: track.summary,
          url: `${SITE_URL}/courses/${track.slug}`,
          inLanguage: 'sq',
          provider: { '@type': 'EducationalOrganization', name: SITE_NAME, url: SITE_URL },
          offers: {
            '@type': 'Offer',
            price: (track.priceCents / 100).toFixed(2),
            priceCurrency: track.currency,
            availability:
              group && group.seatsLeft > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/SoldOut',
          },
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'online',
            ...(group && { startDate: group.startDate }),
          },
        },
      };
    }),
  };
}

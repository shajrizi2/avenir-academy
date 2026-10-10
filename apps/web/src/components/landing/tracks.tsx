import type { CourseDetail } from '@ai-academy/shared';
import { ArrowRight, Clock, Languages } from 'lucide-react';
import { Suspense } from 'react';
import { ModulePath } from '@/components/course/module-path';
import { trackTheme } from '@/components/course/track-theme';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from '@/i18n/format';
import type { LandingMessages } from '@/i18n/messages';
import { getLandingMessages } from '@/i18n/server';
import { getTracks } from '@/lib/landing-data';
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
  const [{ locale, t }, loaded] = await Promise.all([getLandingMessages(), getTracks()]);
  const tracks = loaded?.map((track) => localizeCourse(track, locale));
  if (!tracks || tracks.length === 0) {
    return <p className="text-ink-soft text-center">{t.tracks.unavailable}</p>;
  }
  return (
    <>
      <ul className="grid gap-6 lg:grid-cols-2">
        {tracks.map((track) => (
          <li key={track.id}>
            <TrackCard track={track} locale={locale} t={t.tracks} />
          </li>
        ))}
      </ul>
      <JsonLd data={coursesJsonLd(tracks)} />
    </>
  );
}

interface TrackCardProps {
  track: CourseDetail;
  locale: 'sq' | 'en';
  t: LandingMessages['tracks'];
}

function TrackCard({ track, locale, t }: TrackCardProps) {
  const theme = trackTheme(track.slug);
  return (
    <article
      className={cn('reveal rounded-card flex h-full flex-col p-6 sm:p-8 lg:p-10', theme.tint)}
    >
      <span
        className={cn(
          'border-ink text-ink flex size-14 items-center justify-center rounded-2xl border-2 shadow-[0_3px_0_var(--ink)]',
          theme.fill,
        )}
      >
        <theme.Icon className="size-7" aria-hidden />
      </span>
      <h3 className="text-ink text-heading mt-6 font-extrabold">{track.title}</h3>
      <p className="text-ink mt-2 text-lg">{track.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill icon={Languages}>{t.languageBadge}</Pill>
        <Pill icon={Clock}>{t.perModule}</Pill>
      </div>

      <h4 className="sr-only">{t.modulesLabel}</h4>
      <div className="mt-8 flex-1">
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

      <CtaLink
        href={`/courses/${track.slug}`}
        cta={`track_${track.slug}`}
        locale={locale}
        variant="chunky"
        size="lg"
        className="mt-8 self-start"
      >
        {t.viewTrack} <ArrowRight data-icon="inline-end" />
        <span className="sr-only">: {track.title}</span>
      </CtaLink>
    </article>
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="rounded-card h-[560px]" />
      <Skeleton className="rounded-card h-[560px]" />
    </div>
  );
}

function coursesJsonLd(tracks: CourseDetail[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: tracks.map((track, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        name: track.title,
        description: track.summary,
        url: `${SITE_URL}/courses/${track.slug}`,
        // Classes are taught in Albanian whichever language this page is in.
        inLanguage: 'sq',
        provider: { '@type': 'EducationalOrganization', name: SITE_NAME, url: SITE_URL },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          ...(track.startDate && { startDate: track.startDate }),
        },
      },
    })),
  };
}

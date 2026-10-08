import type { CourseDetail } from '@ai-academy/shared';
import { ArrowRight, Clock, Languages, Lock } from 'lucide-react';
import { Suspense } from 'react';
import { trackTheme } from '@/components/course/track-theme';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from '@/i18n/format';
import type { LandingMessages } from '@/i18n/messages';
import { getLandingMessages } from '@/i18n/server';
import { getTracks } from '@/lib/landing-data';
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
  const [{ locale, t }, tracks] = await Promise.all([getLandingMessages(), getTracks()]);
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
      <ol className="mt-8 flex-1">
        {track.modules.map((module, i) => {
          const first = i === 0;
          const last = i === track.modules.length - 1;
          return (
            <li key={module.id} className="relative flex gap-4 pb-5 last:pb-0">
              {!last && (
                <span
                  aria-hidden
                  className="bg-ink/20 absolute top-10 bottom-1 left-[19px] w-0.5"
                />
              )}
              <span
                aria-hidden
                className={cn(
                  'border-ink flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold',
                  first ? cn(theme.fill, 'text-ink') : 'bg-background text-ink-soft',
                )}
              >
                {first ? module.order : <Lock className="size-4" />}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-ink-soft text-xs font-semibold">
                  {format(t.moduleLabel, { number: module.order })}
                  <span aria-hidden> · </span>
                  {first ? t.startHere : format(t.lockedUntil, { number: module.order - 1 })}
                </p>
                <p className="text-ink font-bold">{module.title}</p>
              </div>
            </li>
          );
        })}
      </ol>

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

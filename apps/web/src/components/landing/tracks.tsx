import type { CourseDetail } from '@ai-academy/shared';
import { Clock, Languages } from 'lucide-react';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LandingMessages } from '@/i18n/messages';
import { getLandingMessages } from '@/i18n/server';
import { getTracks } from '@/lib/landing-data';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { CtaLink } from './cta-link';
import { JsonLd } from './json-ld';
import { LandingSection } from './landing-section';

export async function Tracks() {
  const { t } = await getLandingMessages();
  return (
    <LandingSection
      id="tracks"
      tone="muted"
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
    return <p className="text-center text-slate-600">{t.tracks.unavailable}</p>;
  }
  return (
    <>
      <ul className="grid gap-6 md:grid-cols-2">
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
  return (
    <article className="reveal flex h-full flex-col rounded-xl border bg-white p-6 sm:p-8">
      <div className="flex flex-wrap gap-2">
        <Pill icon={Languages}>{t.languageBadge}</Pill>
        <Pill icon={Clock}>{t.perModule}</Pill>
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{track.title}</h3>
      <p className="mt-2 text-slate-600">{track.summary}</p>

      <h4 className="sr-only">{t.modulesLabel}</h4>
      <ol className="mt-6 flex-1 space-y-3">
        {track.modules.map((module) => (
          <li key={module.id} className="flex items-center gap-3">
            <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {module.order}
            </span>
            <span className="font-medium text-slate-800">{module.title}</span>
          </li>
        ))}
      </ol>

      <CtaLink
        href={`/courses/${track.slug}`}
        cta={`track_${track.slug}`}
        locale={locale}
        variant="outline"
        size="lg"
        className="mt-8 h-11 self-start"
      >
        {t.viewTrack}
        <span className="sr-only">: {track.title}</span>
      </CtaLink>
    </article>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

function TrackSkeletons() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
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

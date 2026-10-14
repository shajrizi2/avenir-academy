import {
  type CourseDetail,
  discountPercent,
  formatPrice,
  formatSqDate,
  GROUP_MAX_CAPACITY,
  type GroupSummary,
} from '@ai-academy/shared';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Layers,
  Tag,
  UserRound,
  Users,
  Video,
  WifiOff,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { EnrollPanel } from '@/components/course/enroll-panel';
import { ModulePath } from '@/components/course/module-path';
import { trackTheme } from '@/components/course/track-theme';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { ApiError } from '@/lib/api';
import { localizeCourse } from '@/lib/localize';
import { serverGet } from '@/lib/server-api';
import { cn } from '@/lib/utils';

export async function generateMetadata({
  params,
}: PageProps<'/courses/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = localizeCourse(
      await serverGet<CourseDetail>(`/courses/${encodeURIComponent(slug)}`),
      'sq',
    );
    return { title: course.title, description: course.summary };
  } catch {
    return { title: t.meta.pages.courses };
  }
}

export default function CourseDetailPage({ params }: PageProps<'/courses/[slug]'>) {
  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CourseDetailContent params={params} />
    </Suspense>
  );
}

async function CourseDetailContent({ params }: Pick<PageProps<'/courses/[slug]'>, 'params'>) {
  const { slug } = await params;
  let course: CourseDetail;
  try {
    course = localizeCourse(
      await serverGet<CourseDetail>(`/courses/${encodeURIComponent(slug)}`),
      'sq',
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  let groups: GroupSummary[] = [];
  try {
    groups = await serverGet<GroupSummary[]>(`/groups?courseId=${encodeURIComponent(course.id)}`);
  } catch {
    // The page still renders without groups; the enrol panel says the next group is coming.
  }
  const theme = trackTheme(course.slug);
  const d = t.catalog.detail;
  const price = formatPrice(course.priceCents, course.currency);
  const listPrice =
    course.listPriceCents && discountPercent(course.priceCents, course.listPriceCents) > 0
      ? formatPrice(course.listPriceCents, course.currency)
      : null;
  const nextGroup = groups[0] ?? null;

  return (
    <article>
      <header className={cn('border-line border-b', theme.tint)}>
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_280px] lg:py-16">
          <div>
            <BackLink />
            <span
              className={cn(
                'border-ink text-ink mt-6 flex size-14 items-center justify-center rounded-2xl border-2 shadow-[0_3px_0_var(--ink)]',
                theme.fill,
              )}
            >
              <theme.Icon className="size-7" aria-hidden />
            </span>
            <h1 className="text-ink text-heading lg:text-title mt-5 font-extrabold text-balance">
              {course.title}
            </h1>
            <p className="text-ink mt-3 max-w-2xl text-lg">{course.summary}</p>
          </div>
          <theme.Illustration className="hidden md:block" />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-16">
        <div className="space-y-12">
          <section className="space-y-3">
            <h2 className="text-ink text-subheading font-extrabold">{d.about}</h2>
            <p className="text-ink-soft text-lg leading-8 whitespace-pre-line">
              {course.description}
            </p>
          </section>
          <section className="space-y-6">
            <h2 className="text-ink text-subheading font-extrabold">{d.modules}</h2>
            <ModulePath
              accent={theme.fill}
              steps={course.modules.map((module, i) => ({
                ...module,
                caption: fmt(d.moduleCaption, {
                  number: module.order,
                  state: i === 0 ? d.startsHere : fmt(d.unlocksAfter, { number: module.order - 1 }),
                }),
                children: (
                  <div className="mt-1 space-y-2">
                    <p className="text-ink-soft">{module.description}</p>
                    <div className="text-ink-soft flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" aria-hidden />
                        {fmt(d.moduleFacts, { weeks: module.durationWeeks })}
                      </span>
                      {module.instructor && (
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-4" aria-hidden />
                          {module.instructor.firstName} {module.instructor.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                ),
              }))}
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border-ink rounded-card bg-background space-y-5 border-2 p-6 shadow-[0_6px_0_var(--ink)]">
            <p className="text-ink flex flex-wrap items-baseline gap-x-2">
              <span className="text-title font-extrabold">{price}</span>
              <span className="text-ink-soft font-semibold">{t.catalog.card.perMonth}</span>
              {listPrice && (
                <span className="text-ink-soft text-sm">
                  <s>{listPrice}</s>
                  <span className="bg-track-marketing-tint text-track-marketing-ink ml-2 rounded-full px-2 py-0.5 text-xs font-bold">
                    -{discountPercent(course.priceCents, course.listPriceCents)}%
                  </span>
                </span>
              )}
            </p>
            <ul className="text-ink space-y-3 text-sm">
              <Fact icon={Layers}>{fmt(d.factModules, { count: course.modules.length })}</Fact>
              <Fact icon={Video}>{d.factLive}</Fact>
              <Fact icon={Clock}>{d.factSchedule}</Fact>
              <Fact icon={Users}>
                {fmt(t.landing.tracks.maxPerGroup, { count: GROUP_MAX_CAPACITY })}
              </Fact>
              <Fact icon={WifiOff}>{d.factOffline}</Fact>
              {nextGroup && (
                <Fact icon={CalendarDays}>
                  {fmt(d.factStarts, { date: formatDay(nextGroup.startDate) })}
                </Fact>
              )}
              <Fact icon={Tag}>{fmt(d.pricePerMonth, { price })}</Fact>
            </ul>
            <EnrollPanel courseId={course.id} courseSlug={course.slug} groups={groups} />
            <p className="text-ink-soft text-sm">{d.paymentNote}</p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="text-ink-soft mt-0.5 size-5 shrink-0" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/** "YYYY-MM-DD" → "e hënë, 2 nëntor 2026" (noon UTC keeps the day in Europe/Tirane). */
function formatDay(key: string): string {
  return formatSqDate(`${key}T12:00:00Z`, { weekday: true });
}

function BackLink() {
  return (
    <Link
      href="/courses"
      className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> {t.catalog.detail.allCourses}
    </Link>
  );
}

function CourseDetailSkeleton() {
  return (
    <div>
      <div className="bg-background border-line border-b">
        <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-10 sm:px-6 lg:py-16">
          <BackLink />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-full max-w-xl" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="rounded-card h-80" />
        <Skeleton className="rounded-card h-64" />
      </div>
    </div>
  );
}

import type { CourseDetail } from '@ai-academy/shared';
import { ArrowLeft, CalendarDays, Clock, Layers, UserRound, Video } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { EnrollButton } from '@/components/course/enroll-button';
import { ModulePath } from '@/components/course/module-path';
import { trackTheme } from '@/components/course/track-theme';
import { LocalDateTime } from '@/components/local-date-time';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { serverGet } from '@/lib/server-api';
import { cn } from '@/lib/utils';

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
    course = await serverGet<CourseDetail>(`/courses/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const theme = trackTheme(course.slug);

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

      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px] lg:py-16">
        <div className="space-y-12">
          <section className="space-y-3">
            <h2 className="text-ink text-subheading font-extrabold">About this course</h2>
            <p className="text-ink-soft text-lg leading-8 whitespace-pre-line">
              {course.description}
            </p>
          </section>
          <section className="space-y-6">
            <h2 className="text-ink text-subheading font-extrabold">Modules</h2>
            <ModulePath
              accent={theme.fill}
              steps={course.modules.map((module, i) => ({
                ...module,
                caption: `Module ${module.order} · ${i === 0 ? 'Starts here' : `Unlocks after module ${module.order - 1}`}`,
                children: (
                  <div className="mt-1 space-y-2">
                    <p className="text-ink-soft">{module.description}</p>
                    <div className="text-ink-soft flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" aria-hidden />
                        {module.durationWeeks} weeks · live on Google Meet · ends with a test
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
            <ul className="text-ink space-y-3">
              <li className="flex items-center gap-3">
                <Layers className="text-ink-soft size-5" aria-hidden />
                {course.modules.length} modules, about one month each
              </li>
              <li className="flex items-center gap-3">
                <Video className="text-ink-soft size-5" aria-hidden />
                Live classes on Google Meet
              </li>
              {course.startDate && (
                <li className="flex items-center gap-3">
                  <CalendarDays className="text-ink-soft size-5" aria-hidden />
                  <span>
                    Starts{' '}
                    <LocalDateTime value={course.startDate} options={{ dateStyle: 'long' }} />
                  </span>
                </li>
              )}
            </ul>
            <EnrollButton courseId={course.id} courseSlug={course.slug} />
            <p className="text-ink-soft text-sm">
              Enrollment is confirmed manually by our team. No payment is taken online.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function BackLink() {
  return (
    <Link
      href="/courses"
      className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden /> All courses
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
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px]">
        <Skeleton className="rounded-card h-80" />
        <Skeleton className="rounded-card h-64" />
      </div>
    </div>
  );
}

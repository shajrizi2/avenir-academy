import type { CourseDetail } from '@ai-academy/shared';
import { ArrowLeft, CalendarDays, Layers, Video } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { EnrollButton } from '@/components/course/enroll-button';
import { ModuleList } from '@/components/course/module-list';
import { LocalDateTime } from '@/components/local-date-time';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { serverGet } from '@/lib/server-api';

export default function CourseDetailPage({ params }: PageProps<'/courses/[slug]'>) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
      <Link
        href="/courses"
        className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:text-slate-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> All courses
      </Link>
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseDetailContent params={params} />
      </Suspense>
    </div>
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

  return (
    <article className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{course.title}</h1>
          <p className="text-lg text-slate-600">{course.summary}</p>
        </header>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">About this course</h2>
          <p className="whitespace-pre-line text-slate-700">{course.description}</p>
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Modules</h2>
          <ModuleList modules={course.modules} />
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4 rounded-xl border bg-white p-6">
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <Layers className="text-muted-foreground size-4" aria-hidden />
              {course.modules.length} modules, about one month each
            </li>
            <li className="flex items-center gap-2">
              <Video className="text-muted-foreground size-4" aria-hidden />
              Live classes on Google Meet
            </li>
            {course.startDate && (
              <li className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground size-4" aria-hidden />
                <span>
                  Starts <LocalDateTime value={course.startDate} options={{ dateStyle: 'long' }} />
                </span>
              </li>
            )}
          </ul>
          <EnrollButton courseId={course.id} courseSlug={course.slug} />
          <p className="text-muted-foreground text-xs">
            Enrollment is confirmed manually by our team. No payment is taken online.
          </p>
        </div>
      </aside>
    </article>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

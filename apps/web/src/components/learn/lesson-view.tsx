'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { lessonQuery } from '@/lib/queries';
import { Markdown } from './markdown';
import { MaterialItem } from './material-item';
import { VideoEmbed } from './video-embed';

/** One offline lesson: video, Markdown content, materials and the completion toggle. */
export function LessonView() {
  const { courseSlug, moduleId, lessonId } = useParams<{
    courseSlug: string;
    moduleId: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: lesson, isPending, error } = useQuery(lessonQuery(lessonId));
  const l = t.lessons;

  const complete = useMutation({
    mutationFn: (done: boolean) =>
      apiFetch(`/lessons/${lessonId}/complete`, { method: 'POST', body: { done } }),
    onSuccess: (_data, done) => {
      toast.success(done ? l.marked : l.unmarked);
      void queryClient.invalidateQueries({ queryKey: ['lessons', lessonId] });
      void queryClient.invalidateQueries({ queryKey: ['modules', moduleId] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;

  const backHref = `/learn/${courseSlug}/${moduleId}`;
  const done = Boolean(lesson.completedAt);

  return (
    <>
      <Link
        href={backHref}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {l.backToModule}
      </Link>
      <header className="space-y-2">
        <p className="text-ink-soft text-sm font-semibold">
          {fmt(t.common.module, { number: lesson.module.order })}: {lesson.module.title} ·{' '}
          {fmt(l.lessonN, { number: lesson.order })}
        </p>
        <h1 className="text-ink text-heading font-extrabold">{lesson.title}</h1>
        <div className="text-ink-soft flex flex-wrap items-center gap-3 text-sm">
          {lesson.estimatedMin && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />{' '}
              {fmt(l.minutes, { count: lesson.estimatedMin })}
            </span>
          )}
          {done && (
            <span className="text-passed-ink inline-flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="size-4" aria-hidden /> {l.completed}
            </span>
          )}
        </div>
      </header>

      {lesson.videoUrl && <VideoEmbed url={lesson.videoUrl} title={l.video} />}

      <article className="rounded-card bg-background border-line border p-6 sm:p-8">
        <Markdown content={lesson.content} />
      </article>

      {lesson.materials.length > 0 && (
        <section aria-labelledby="lesson-materials" className="space-y-3">
          <h2 id="lesson-materials" className="text-ink text-subheading font-extrabold">
            {l.materials}
          </h2>
          <ul className="space-y-3">
            {lesson.materials.map((m) => (
              <MaterialItem key={m.id} material={m} />
            ))}
          </ul>
        </section>
      )}

      <div className="border-line flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {lesson.previous ? (
            <Button asChild variant="outline">
              <Link href={`/learn/${courseSlug}/${moduleId}/lessons/${lesson.previous.id}`}>
                <ArrowLeft data-icon="inline-start" /> {l.previous}
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'STUDENT' && (
            <Button
              variant={done ? 'chunky-outline' : 'chunky'}
              disabled={complete.isPending}
              onClick={() => complete.mutate(!done)}
            >
              <CheckCircle2 data-icon="inline-start" /> {done ? l.markUndone : l.markDone}
            </Button>
          )}
          {lesson.next ? (
            <Button asChild variant={done ? 'chunky' : 'outline'}>
              <Link href={`/learn/${courseSlug}/${moduleId}/lessons/${lesson.next.id}`}>
                {l.next} <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            done && (
              <Button asChild variant="outline">
                <Link href={backHref}>{l.allDone}</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { type CourseDetail, formatPrice } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Library, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { formatDate } from '@/components/local-date-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, errorMessage } from '@/lib/api';
import { fmt, plural, t } from '@/i18n/messages';
import { adminCoursesQuery } from '@/lib/queries';
import { CourseForm, type CourseFormOutput } from './course-form';

export function CourseList() {
  const { data, isPending, error } = useQuery(adminCoursesQuery);

  return (
    <div className="space-y-6">
      <NewCourseButton />
      {isPending ? (
        <Skeleton className="rounded-card h-48 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Library}
          title={t.admin.courses.emptyTitle}
          description={t.admin.courses.emptyText}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((course) => (
            <li key={course.id} className="relative">
              <div className="border-line rounded-card bg-background hover:border-ink flex h-full flex-col gap-3 border-2 p-5 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-ink text-lg font-bold">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="after:rounded-card after:absolute after:inset-0 focus-visible:outline-none"
                    >
                      {course.title}
                    </Link>
                  </h2>
                  <Badge variant={course.isPublished ? 'ai' : 'secondary'}>
                    {course.isPublished ? t.admin.courses.published : t.admin.courses.draft}
                  </Badge>
                </div>
                <p className="text-ink-soft text-sm">/{course.slug}</p>
                <p className="text-ink-soft mt-auto text-sm">
                  {plural(course.moduleCount, t.admin.courses.moduleOne, t.admin.courses.modules)}
                  {' · '}
                  {fmt(t.admin.courses.perMonth, {
                    price: formatPrice(course.priceCents, course.currency),
                  })}
                  {course.startDate && (
                    <>
                      {' · '}
                      {fmt(t.admin.courses.starts, { date: formatDate(course.startDate, 'date') })}
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCourseButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  async function create(input: CourseFormOutput) {
    const course = await apiFetch<CourseDetail>('/courses', { method: 'POST', body: input });
    toast.success(t.admin.courses.created);
    void queryClient.invalidateQueries({ queryKey: ['courses'] });
    setOpen(false);
    router.push(`/admin/courses/${course.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="chunky">
          <Plus data-icon="inline-start" /> {t.admin.courses.new}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.admin.courses.new}</DialogTitle>
          <DialogDescription>{t.admin.courses.newText}</DialogDescription>
        </DialogHeader>
        <CourseForm submitLabel={t.admin.courses.create} onSubmit={create} />
      </DialogContent>
    </Dialog>
  );
}

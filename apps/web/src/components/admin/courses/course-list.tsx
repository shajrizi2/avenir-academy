'use client';

import type { CourseDetail, CourseInput } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Library, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { LocalDateTime } from '@/components/local-date-time';
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
import { adminCoursesQuery } from '@/lib/queries';
import { CourseForm } from './course-form';

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
          title="No courses yet"
          description="Create the first course, then add its modules."
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
                    {course.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <p className="text-ink-soft text-sm">/{course.slug}</p>
                <p className="text-ink-soft mt-auto text-sm">
                  {course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}
                  {course.startDate && (
                    <>
                      {' '}
                      · starts{' '}
                      <LocalDateTime value={course.startDate} options={{ dateStyle: 'medium' }} />
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

  async function create(input: CourseInput) {
    const course = await apiFetch<CourseDetail>('/courses', { method: 'POST', body: input });
    toast.success('Course created. Now add its modules.');
    void queryClient.invalidateQueries({ queryKey: ['courses'] });
    setOpen(false);
    router.push(`/admin/courses/${course.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="chunky">
          <Plus data-icon="inline-start" /> New course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>
            Start as a draft; publish it once the modules are in place.
          </DialogDescription>
        </DialogHeader>
        <CourseForm submitLabel="Create course" onSubmit={create} />
      </DialogContent>
    </Dialog>
  );
}

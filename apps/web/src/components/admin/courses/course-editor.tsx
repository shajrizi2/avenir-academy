'use client';

import type { CourseDetail, ModuleSummary, moduleSchema } from '@ai-academy/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Layers, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { z } from 'zod';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, errorMessage } from '@/lib/api';
import { fmt, t } from '@/i18n/messages';
import { adminCourseQuery } from '@/lib/queries';
import { CourseForm, type CourseFormOutput } from './course-form';
import { ModuleFormDialog } from './module-form-dialog';

type ModuleValues = z.output<typeof moduleSchema>;

export function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: course, isPending, error } = useQuery(adminCourseQuery(id));

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;

  return (
    <>
      <Link
        href="/admin/courses"
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t.admin.courses.allCourses}
      </Link>
      <PageHeader
        title={course.title}
        description={`/courses/${course.slug}`}
        actions={
          course.isPublished && (
            <Button asChild variant="chunky-outline">
              <Link href={`/courses/${course.slug}`} target="_blank">
                {t.admin.courses.viewPublic} <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          )
        }
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <DetailsCard course={course} />
        <ModulesCard course={course} />
      </div>
    </>
  );
}

function DetailsCard({ course }: { course: CourseDetail }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  async function save(input: CourseFormOutput) {
    await apiFetch(`/courses/${course.id}`, { method: 'PATCH', body: input });
    toast.success(t.admin.courses.saved);
    await queryClient.invalidateQueries({ queryKey: ['courses'] });
  }

  async function remove() {
    try {
      await apiFetch(`/courses/${course.id}`, { method: 'DELETE' });
      toast.success(t.admin.courses.deleted);
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      router.push('/admin/courses');
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Settings2 className="size-5" aria-hidden /> {t.admin.courses.details}
          <Badge variant={course.isPublished ? 'ai' : 'secondary'} className="ml-auto">
            {course.isPublished ? t.admin.courses.published : t.admin.courses.draft}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Remount when the saved course changes so the form shows the new values. */}
        <CourseForm
          key={JSON.stringify(course)}
          course={course}
          submitLabel={t.admin.courses.saveChanges}
          onSubmit={save}
        />
        <div className="border-line border-t pt-6">
          <ConfirmDialog
            trigger={
              <Button variant="destructive">
                <Trash2 data-icon="inline-start" /> {t.admin.courses.deleteCourse}
              </Button>
            }
            title={t.admin.courses.deleteTitle}
            description={t.admin.courses.deleteText}
            confirmLabel={t.admin.courses.deleteCourse}
            onConfirm={remove}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ModulesCard({ course }: { course: CourseDetail }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['courses'] });

  async function create(values: ModuleValues) {
    await apiFetch(`/courses/${course.id}/modules`, { method: 'POST', body: values });
    toast.success(t.admin.courses.moduleAdded);
    await refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle as="h2" className="flex items-center gap-2">
          <Layers className="size-5" aria-hidden /> {t.admin.courses.modulesCard}
        </CardTitle>
        <ModuleFormDialog
          title={t.admin.courses.addModuleTitle}
          onSubmit={create}
          trigger={
            <Button variant="chunky" size="sm">
              <Plus data-icon="inline-start" /> {t.admin.courses.addModule}
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {course.modules.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={t.admin.courses.noModulesTitle}
            description={t.admin.courses.noModulesText}
          />
        ) : (
          <ol className="space-y-3">
            {course.modules.map((module, i) => (
              <ModuleRow
                key={module.id}
                module={module}
                isLast={i === course.modules.length - 1}
                onChanged={refresh}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleRow({
  module,
  isLast,
  onChanged,
}: {
  module: ModuleSummary;
  isLast: boolean;
  onChanged: () => Promise<unknown>;
}) {
  async function update(values: ModuleValues) {
    await apiFetch(`/modules/${module.id}`, { method: 'PATCH', body: values });
    toast.success(t.admin.courses.moduleSaved);
    await onChanged();
  }

  async function remove() {
    try {
      await apiFetch(`/modules/${module.id}`, { method: 'DELETE' });
      toast.success(t.admin.courses.moduleDeleted);
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <li className="border-line rounded-card flex flex-col gap-3 border p-4 sm:flex-row sm:items-center">
      <span className="border-ink text-ink flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-extrabold">
        {module.order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ink font-bold">{module.title}</p>
        <p className="text-ink-soft text-sm">
          {fmt(t.admin.courses.weeks, { count: module.durationWeeks })} ·{' '}
          {module.instructor
            ? `${module.instructor.firstName} ${module.instructor.lastName}`
            : t.admin.courses.noInstructor}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/teach/modules/${module.id}`}>{t.admin.courses.sessionsMaterials}</Link>
        </Button>
        <ModuleFormDialog
          title={fmt(t.admin.courses.editModule, { number: module.order })}
          module={module}
          onSubmit={update}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fmt(t.admin.courses.editModuleLabel, { title: module.title })}
            >
              <Pencil />
            </Button>
          }
        />
        {isLast && (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={fmt(t.admin.courses.deleteModuleLabel, { title: module.title })}
              >
                <Trash2 />
              </Button>
            }
            title={t.admin.courses.deleteModuleTitle}
            description={t.admin.courses.deleteModuleText}
            confirmLabel={t.admin.courses.deleteModule}
            onConfirm={remove}
          />
        )}
      </div>
    </li>
  );
}

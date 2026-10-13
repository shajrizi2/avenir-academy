'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormError } from '@/components/form-error';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { moduleQuery } from '@/lib/queries';
import { LessonsPanel } from './lessons-panel';
import { MaterialsPanel } from './materials-panel';
import { SessionsPanel } from './sessions-panel';
import { TestPanel } from './test-panel';

export function ModuleManager() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: module, isPending, error } = useQuery(moduleQuery(id));
  const m = t.teach.module;

  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;

  const back =
    user?.role === 'ADMIN'
      ? { href: `/admin/courses/${module.course.id}`, label: module.course.title }
      : { href: '/teach', label: m.myModules };

  return (
    <>
      <Link
        href={back.href}
        className="text-ink inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {back.label}
      </Link>
      <PageHeader
        title={fmt(m.title, { number: module.order, title: module.title })}
        description={
          module.instructor
            ? fmt(m.taughtBy, {
                course: module.course.title,
                name: `${module.instructor.firstName} ${module.instructor.lastName}`,
              })
            : fmt(m.noInstructor, { course: module.course.title })
        }
      />
      <div className="grid gap-8">
        <SessionsPanel moduleId={module.id} />
        <LessonsPanel moduleId={module.id} />
        <MaterialsPanel moduleId={module.id} materials={module.materials} />
        <TestPanel moduleId={module.id} test={module.test} />
      </div>
    </>
  );
}

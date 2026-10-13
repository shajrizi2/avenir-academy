'use client';

import {
  type LessonInput,
  type LessonSummary,
  type LessonValues,
  lessonSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BookOpenCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { TextareaField } from '@/components/form/textarea-field';
import { Markdown } from '@/components/learn/markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { moduleLessonsQuery } from '@/lib/queries';

const l = t.lessonsEditor;

/** Offline lessons of one module: create, edit, delete and reorder. */
export function LessonsPanel({ moduleId }: { moduleId: string }) {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(moduleLessonsQuery(moduleId));
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['modules', moduleId] }),
      queryClient.invalidateQueries({ queryKey: ['lessons'] }),
    ]);

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<LessonSummary[]>(`/modules/${moduleId}/lessons/order`, {
        method: 'PUT',
        body: { ids },
      }),
    onSuccess: async () => {
      toast.success(l.reordered);
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function move(index: number, delta: number) {
    if (!data) return;
    const ids = data.map((x) => x.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  }

  async function create(values: LessonValues) {
    await apiFetch(`/modules/${moduleId}/lessons`, { method: 'POST', body: toBody(values) });
    toast.success(l.created);
    await refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle as="h2" className="flex items-center gap-2">
            <BookOpenCheck className="size-5" aria-hidden /> {l.title}
          </CardTitle>
          <CardDescription className="mt-1">{l.description}</CardDescription>
        </div>
        <LessonFormDialog
          title={l.new}
          onSubmit={create}
          trigger={
            <Button variant="chunky" size="sm">
              <Plus data-icon="inline-start" /> {l.add}
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : error ? (
          <FormError message={errorMessage(error)} />
        ) : data.length === 0 ? (
          <p className="text-ink-soft">{l.empty}</p>
        ) : (
          <ol className="space-y-3">
            {data.map((lesson, i) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                first={i === 0}
                last={i === data.length - 1}
                onMove={(delta) => move(i, delta)}
                onChanged={refresh}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function LessonRow({
  lesson,
  first,
  last,
  onMove,
  onChanged,
}: {
  lesson: LessonSummary;
  first: boolean;
  last: boolean;
  onMove: (delta: number) => void;
  onChanged: () => Promise<unknown>;
}) {
  const detail = useQuery({
    queryKey: ['lessons', lesson.id],
    queryFn: () => apiFetch<{ content: string; videoUrl: string | null }>(`/lessons/${lesson.id}`),
    enabled: false,
  });

  async function update(values: LessonValues) {
    await apiFetch(`/lessons/${lesson.id}`, { method: 'PATCH', body: toBody(values) });
    toast.success(l.saved);
    await onChanged();
  }

  async function remove() {
    try {
      await apiFetch(`/lessons/${lesson.id}`, { method: 'DELETE' });
      toast.success(l.deleted);
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <li className="border-line rounded-card flex flex-col gap-3 border p-4 sm:flex-row sm:items-center">
      <span className="border-ink text-ink flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-extrabold">
        {lesson.order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ink font-bold">{lesson.title}</p>
        <p className="text-ink-soft text-sm">
          {lesson.estimatedMin ? fmt(t.lessons.minutes, { count: lesson.estimatedMin }) : null}
          {lesson.estimatedMin && lesson.hasVideo ? ' · ' : null}
          {lesson.hasVideo ? t.lessons.video : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={l.moveUp}
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={l.moveDown}
          disabled={last}
          onClick={() => onMove(1)}
        >
          <ArrowDown />
        </Button>
        <LessonFormDialog
          title={l.edit}
          lesson={lesson}
          load={() => detail.refetch().then((r) => r.data ?? null)}
          onSubmit={update}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fmt(l.editAria, { title: lesson.title })}
            >
              <Pencil />
            </Button>
          }
        />
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fmt(l.deleteAria, { title: lesson.title })}
            >
              <Trash2 />
            </Button>
          }
          title={l.deleteTitle}
          description={l.deleteText}
          confirmLabel={t.common.delete}
          onConfirm={remove}
        />
      </div>
    </li>
  );
}

function toBody(values: LessonValues) {
  return {
    ...values,
    videoUrl: values.videoUrl || null,
    estimatedMin:
      values.estimatedMin === '' || values.estimatedMin === undefined ? null : values.estimatedMin,
  };
}

function LessonFormDialog({
  trigger,
  title,
  lesson,
  load,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  lesson?: LessonSummary;
  /** Editing: fetches the content and video when the dialog opens. */
  load?: () => Promise<{ content: string; videoUrl: string | null } | null>;
  onSubmit: (values: LessonValues) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const form = useForm<LessonInput, unknown, LessonValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: lesson?.title ?? '',
      content: '',
      videoUrl: '',
      estimatedMin: lesson?.estimatedMin ?? '',
    },
  });

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && load) {
      const detail = await load();
      if (detail)
        form.reset({
          ...form.getValues(),
          content: detail.content,
          videoUrl: detail.videoUrl ?? '',
        });
    }
  }

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(values);
      setOpen(false);
      if (!lesson) form.reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => void onOpenChange(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <FormError message={error} />
            <TextField form={form} name="title" label={l.lessonTitle} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                form={form}
                name="videoUrl"
                label={l.videoUrl}
                type="url"
                description={l.videoHint}
              />
              <TextField form={form} name="estimatedMin" label={l.estimatedMin} type="number" />
            </div>
            {preview ? (
              <div className="border-line rounded-card max-h-96 overflow-y-auto border p-4">
                <Markdown content={form.getValues('content') || ''} />
              </div>
            ) : (
              <TextareaField
                form={form}
                name="content"
                label={l.content}
                rows={14}
                description={l.contentHint}
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t.common.saving
                  : lesson
                    ? t.common.saveChanges
                    : t.common.add}
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreview((v) => !v)}>
                {preview ? l.content : l.preview}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import {
  type AdminGroup,
  type CourseSummary,
  generateSessionTimes,
  GROUP_MAX_CAPACITY,
  type GroupInput,
  groupSchema,
  type GroupValues,
  SQ_WEEKDAYS_SHORT,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { FormError } from '@/components/form-error';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { formatDate } from '@/components/local-date-time';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { instructorsQuery } from '@/lib/queries';
import { cn } from '@/lib/utils';

/** Monday first, as Albanian calendars show the week. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export interface GroupFormValues extends GroupValues {
  courseId: string;
}

interface GroupFormDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  group?: AdminGroup;
  /** For a new group: the courses to pick from. */
  courses?: CourseSummary[];
  onSubmit: (values: GroupFormValues) => Promise<unknown>;
}

export function GroupFormDialog({
  trigger,
  title,
  description,
  group,
  courses,
  onSubmit,
}: GroupFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const instructors = useQuery({ ...instructorsQuery, enabled: open });
  const g = t.adminLaunch.groups;
  const form = useForm<GroupInput & { courseId: string }, unknown, GroupFormValues>({
    resolver: zodResolver(groupSchema.extend({ courseId: groupSchema.shape.name })),
    defaultValues: {
      courseId: group?.course.id ?? courses?.[0]?.id ?? '',
      name: group?.name ?? '',
      startDate: group?.startDate ?? '2026-11-01',
      weekdays: group?.weekdays ?? [1, 3, 5],
      startTime: group?.startTime ?? '19:00',
      durationMin: group?.durationMin ?? 120,
      timezone: group?.timezone ?? 'Europe/Tirane',
      capacity: group?.capacity ?? GROUP_MAX_CAPACITY,
      status: group?.status ?? 'OPEN',
      instructorId: group?.instructor?.id ?? '',
      meetUrl: group?.meetUrl ?? '',
      offlineEmailDays: group?.offlineEmailDays ?? [1, 2, 3, 4, 5, 6],
    },
  });

  const [startDate, weekdays, startTime] = useWatch({
    control: form.control,
    name: ['startDate', 'weekdays', 'startTime'],
  });
  const preview =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate ?? '') &&
    weekdays?.length &&
    /^\d{2}:\d{2}$/.test(startTime ?? '')
      ? generateSessionTimes(
          {
            startDate: startDate!,
            weekdays: weekdays!,
            startTime: startTime!,
            timezone: 'Europe/Tirane',
          },
          1,
        )[0]
      : null;

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(values);
      setOpen(false);
      if (!group) form.reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <FormError message={error} />
            {courses && !group && (
              <SelectField
                form={form}
                name="courseId"
                label={g.course}
                options={courses.map((c) => ({ value: c.id, label: c.title }))}
              />
            )}
            <TextField form={form} name="name" label={g.name} placeholder={g.namePlaceholder} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField form={form} name="startDate" label={g.startDate} type="date" />
              <TextField form={form} name="startTime" label={g.startTime} type="time" />
            </div>
            <Controller
              control={form.control}
              name="weekdays"
              render={({ field, fieldState }) => (
                <WeekdayPicker
                  label={g.weekdays}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            {preview && (
              <p className="text-ink-soft text-sm">
                {fmt(g.schedulePreview, { date: formatDate(preview, 'longTime') })}
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField form={form} name="durationMin" label={g.duration} type="number" />
              <TextField
                form={form}
                name="capacity"
                label={fmt(g.capacity, { max: GROUP_MAX_CAPACITY })}
                type="number"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                form={form}
                name="instructorId"
                label={g.instructor}
                options={[
                  { value: '', label: t.common.noInstructor },
                  ...(instructors.data ?? []).map((i) => ({
                    value: i.id,
                    label: `${i.firstName} ${i.lastName}`,
                  })),
                ]}
              />
              <SelectField
                form={form}
                name="status"
                label={g.status}
                options={(['OPEN', 'FULL', 'RUNNING', 'FINISHED'] as const).map((s) => ({
                  value: s,
                  label: t.status.group[s],
                }))}
              />
            </div>
            <TextField
              form={form}
              name="meetUrl"
              label={g.meetUrl}
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              description={g.meetHint}
            />
            <Controller
              control={form.control}
              name="offlineEmailDays"
              render={({ field }) => (
                <WeekdayPicker
                  label={g.offlineDays}
                  hint={g.offlineDaysHint}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
            <div>
              <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t.common.saving
                  : group
                    ? t.common.saveChanges
                    : t.common.create}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WeekdayPicker({
  label,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  value: number[];
  onChange: (days: number[]) => void;
  error?: string;
}) {
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  return (
    <fieldset>
      <legend className="text-ink text-sm font-semibold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {WEEK.map((day) => (
          <button
            key={day}
            type="button"
            aria-pressed={value.includes(day)}
            onClick={() => toggle(day)}
            className={cn(
              'focus-visible:ring-ring/50 h-10 min-w-12 rounded-full border-2 px-3 text-sm font-bold outline-none focus-visible:ring-3',
              value.includes(day)
                ? 'border-ink bg-ink text-primary-foreground'
                : 'border-line-strong bg-background text-ink hover:border-ink',
            )}
          >
            {SQ_WEEKDAYS_SHORT[day]}
          </button>
        ))}
      </div>
      {hint && !error && <p className="text-ink-soft mt-1 text-sm">{hint}</p>}
      {error && <p className="text-failed-ink mt-1 text-sm">{error}</p>}
    </fieldset>
  );
}

'use client';

import { type CourseDetail, type CourseInput, courseSchema } from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { TextareaField } from '@/components/form/textarea-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';

/** Form values: the shared schema, with the date as a local input value and an optional cover. */
const formSchema = courseSchema.extend({
  coverUrl: z.union([z.literal(''), z.url('Enter a full URL (https://…)').max(500)]),
  startDate: z.string(),
  isPublished: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

interface CourseFormProps {
  course?: CourseDetail;
  submitLabel: string;
  onSubmit: (input: CourseInput) => Promise<unknown>;
}

export function CourseForm({ course, submitLabel, onSubmit }: CourseFormProps) {
  const [error, setError] = useState<string | null>(null);
  const publishedId = useId();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: course?.slug ?? '',
      title: course?.title ?? '',
      summary: course?.summary ?? '',
      description: course?.description ?? '',
      titleSq: course?.titleSq ?? '',
      summarySq: course?.summarySq ?? '',
      descriptionSq: course?.descriptionSq ?? '',
      coverUrl: course?.coverUrl ?? '',
      startDate: isoToLocalInput(course?.startDate),
      isPublished: course?.isPublished ?? false,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit({
        ...values,
        coverUrl: values.coverUrl || undefined,
        startDate: values.startDate ? localInputToIso(values.startDate) : undefined,
      });
      form.reset(values);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <FieldGroup>
        <FormError message={error} />
        <TextField form={form} name="title" label="Title" />
        <TextField
          form={form}
          name="slug"
          label="URL slug"
          description="Lowercase letters, numbers and dashes. Courses with “marketing” in the slug use the orange track colour."
        />
        <TextareaField form={form} name="summary" label="Summary" rows={2} />
        <TextareaField form={form} name="description" label="Description" rows={6} />
        <fieldset className="border-line rounded-card space-y-6 border p-4 sm:p-5">
          <legend className="text-ink px-1 text-sm font-bold">Albanian version (optional)</legend>
          <p className="text-ink-soft -mt-2 text-sm">
            Shown on the Albanian landing page (/sq). Leave a field empty to show the English text
            there.
          </p>
          <TextField form={form} name="titleSq" label="Title (Albanian)" />
          <TextareaField form={form} name="summarySq" label="Summary (Albanian)" rows={2} />
          <TextareaField form={form} name="descriptionSq" label="Description (Albanian)" rows={4} />
        </fieldset>
        <TextField
          form={form}
          name="startDate"
          label="Start date (optional)"
          type="datetime-local"
        />
        <TextField form={form} name="coverUrl" label="Cover image URL (optional)" type="url" />
        <Controller
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Checkbox
                id={publishedId}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <Label htmlFor={publishedId}>
                Published (shown in the catalog and on the landing page)
              </Label>
            </div>
          )}
        />
        <div>
          <Button
            type="submit"
            variant="chunky"
            disabled={form.formState.isSubmitting || (Boolean(course) && !form.formState.isDirty)}
          >
            {form.formState.isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

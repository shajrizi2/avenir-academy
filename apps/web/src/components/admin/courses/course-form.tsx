'use client';

import {
  type CourseDetail,
  type CourseInput,
  courseSchema,
  DEFAULT_CURRENCY,
  DEFAULT_LIST_PRICE_CENTS,
  DEFAULT_PRICE_CENTS,
} from '@ai-academy/shared';
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
import { t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';

/** Form values: the shared schema, with the date as a local input value and an optional cover. */
const formSchema = courseSchema.extend({
  coverUrl: z.union([z.literal(''), z.url('Shkruaj një URL të plotë (https://…)').max(500)]),
  startDate: z.string(),
  isPublished: z.boolean(),
});
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

/** What the form sends: the shared input, with null clearing the standard price. */
export type CourseFormOutput = Omit<CourseInput, 'listPriceCents'> & {
  listPriceCents?: number | null;
};

interface CourseFormProps {
  course?: CourseDetail;
  submitLabel: string;
  onSubmit: (input: CourseFormOutput) => Promise<unknown>;
}

export function CourseForm({ course, submitLabel, onSubmit }: CourseFormProps) {
  const [error, setError] = useState<string | null>(null);
  const publishedId = useId();
  const f = t.admin.courses.form;
  const form = useForm<FormInput, unknown, FormValues>({
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
      priceCents: course?.priceCents ?? DEFAULT_PRICE_CENTS,
      listPriceCents: course ? (course.listPriceCents ?? '') : DEFAULT_LIST_PRICE_CENTS,
      currency: course?.currency ?? DEFAULT_CURRENCY,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit({
        ...values,
        coverUrl: values.coverUrl || undefined,
        startDate: values.startDate ? localInputToIso(values.startDate) : undefined,
        // '' clears the struck-through standard price (the API accepts null).
        listPriceCents: values.listPriceCents === '' ? null : values.listPriceCents,
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
        <TextField form={form} name="title" label={f.titleField} />
        <TextField form={form} name="slug" label={f.slug} description={f.slugHint} />
        <TextareaField form={form} name="summary" label={f.summary} rows={2} />
        <TextareaField form={form} name="description" label={f.descriptionField} rows={6} />
        <fieldset className="border-line rounded-card space-y-6 border p-4 sm:p-5">
          <legend className="text-ink px-1 text-sm font-bold">{f.albanianVersion}</legend>
          <p className="text-ink-soft -mt-2 text-sm">{f.albanianHint}</p>
          <TextField form={form} name="titleSq" label={f.titleSq} />
          <TextareaField form={form} name="summarySq" label={f.summarySq} rows={2} />
          <TextareaField form={form} name="descriptionSq" label={f.descriptionSq} rows={4} />
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            form={form}
            name="priceCents"
            label={t.adminLaunch.courseForm.price}
            type="number"
            description={t.adminLaunch.courseForm.priceHint}
          />
          <TextField
            form={form}
            name="listPriceCents"
            label={t.adminLaunch.courseForm.listPrice}
            type="number"
            description={t.adminLaunch.courseForm.listPriceHint}
          />
          <TextField form={form} name="currency" label={t.adminLaunch.courseForm.currency} />
        </div>
        <TextField form={form} name="startDate" label={f.startDate} type="datetime-local" />
        <TextField form={form} name="coverUrl" label={f.coverUrl} type="url" />
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
              <Label htmlFor={publishedId}>{f.publishedLabel}</Label>
            </div>
          )}
        />
        <div>
          <Button
            type="submit"
            variant="chunky"
            disabled={form.formState.isSubmitting || (Boolean(course) && !form.formState.isDirty)}
          >
            {form.formState.isSubmitting ? t.common.saving : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

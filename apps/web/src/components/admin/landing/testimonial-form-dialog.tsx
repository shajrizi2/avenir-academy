'use client';

import {
  type AdminTestimonial,
  type TestimonialInput,
  testimonialSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { TextareaField } from '@/components/form/textarea-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';

export type TestimonialValues = z.output<typeof testimonialSchema>;

interface TestimonialFormDialogProps {
  trigger: React.ReactNode;
  title: string;
  testimonial?: AdminTestimonial;
  onSubmit: (values: TestimonialValues) => Promise<unknown>;
}

export function TestimonialFormDialog({
  trigger,
  title,
  testimonial,
  onSubmit,
}: TestimonialFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<TestimonialInput, unknown, TestimonialValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      name: testimonial?.name ?? '',
      role: testimonial?.role ?? '',
      quote: testimonial?.quote ?? '',
      avatarUrl: testimonial?.avatarUrl ?? '',
      locale: testimonial?.locale ?? 'sq',
      isPublished: testimonial?.isPublished ?? false,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(values);
      setOpen(false);
      if (!testimonial) form.reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t.admin.testimonials.dialogText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <FormError message={error} />
            <TextField form={form} name="name" label={t.admin.testimonials.name} />
            <TextField
              form={form}
              name="role"
              label={t.admin.testimonials.role}
              placeholder={t.admin.testimonials.rolePlaceholder}
            />
            <TextareaField form={form} name="quote" label={t.admin.testimonials.quote} rows={4} />
            <SelectField
              form={form}
              name="locale"
              label={t.admin.testimonials.language}
              options={[
                { value: 'sq', label: t.admin.testimonials.languageSq },
                { value: 'en', label: t.admin.testimonials.languageEn },
              ]}
            />
            <TextField
              form={form}
              name="avatarUrl"
              label={t.admin.testimonials.avatarUrl}
              type="url"
            />
            <Controller
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="testimonial-published"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <Label htmlFor="testimonial-published">
                    {t.admin.testimonials.showOnLanding}
                  </Label>
                </div>
              )}
            />
            <div>
              <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t.common.saving : t.admin.testimonials.save}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

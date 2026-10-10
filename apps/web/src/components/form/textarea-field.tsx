'use client';

import { useId } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

interface TextareaFieldProps<T extends FieldValues, TOutput> {
  form: UseFormReturn<T, unknown, TOutput>;
  name: Path<T>;
  label: string;
  description?: string;
  rows?: number;
}

/** A labelled textarea wired to react-hook-form, showing the zod error message. */
export function TextareaField<T extends FieldValues, TOutput>({
  form,
  name,
  label,
  description,
  rows = 4,
}: TextareaFieldProps<T, TOutput>) {
  const error = form.formState.errors[name];
  // Unique per instance: two forms on one page may both have a "title" field.
  const id = `${useId()}-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} rows={rows} aria-invalid={Boolean(error)} {...form.register(name)} />
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{String(error.message)}</FieldError>}
    </Field>
  );
}

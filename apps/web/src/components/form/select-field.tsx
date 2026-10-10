'use client';

import { useId } from 'react';
import {
  type FieldError as RhfFieldError,
  type FieldValues,
  get,
  type Path,
  type UseFormReturn,
} from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

interface SelectFieldProps<T extends FieldValues, TOutput> {
  form: UseFormReturn<T, unknown, TOutput>;
  name: Path<T>;
  label: string;
  options: { value: string; label: string }[];
  description?: string;
}

/** A native <select> (works everywhere, incl. phones) wired to react-hook-form. */
export function SelectField<T extends FieldValues, TOutput>({
  form,
  name,
  label,
  options,
  description,
}: SelectFieldProps<T, TOutput>) {
  // get() also resolves nested paths such as `questions.0.text`.
  const error = get(form.formState.errors, name) as RhfFieldError | undefined;
  // Unique per instance: two forms on one page may both have a "title" field.
  const id = `${useId()}-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          'border-input bg-background text-ink focus-visible:border-ink focus-visible:ring-ring/40 aria-invalid:border-destructive h-11 w-full rounded-lg border px-3 text-base outline-none focus-visible:ring-3 md:text-sm',
        )}
        {...form.register(name)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{String(error.message)}</FieldError>}
    </Field>
  );
}

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
import { Input } from '@/components/ui/input';

interface TextFieldProps<T extends FieldValues, TOutput> {
  form: UseFormReturn<T, unknown, TOutput>;
  name: Path<T>;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  description?: string;
  placeholder?: string;
}

/** A labelled input wired to react-hook-form, showing the zod error message. */
export function TextField<T extends FieldValues, TOutput>({
  form,
  name,
  label,
  type = 'text',
  autoComplete,
  description,
  placeholder,
}: TextFieldProps<T, TOutput>) {
  // get() also resolves nested paths such as `questions.0.text`.
  const error = get(form.formState.errors, name) as RhfFieldError | undefined;
  // Unique per instance: two forms on one page may both have a "title" field.
  const id = `${useId()}-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        {...form.register(name)}
      />
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{String(error.message)}</FieldError>}
    </Field>
  );
}

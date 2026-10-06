'use client';

import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
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
  const error = form.formState.errors[name];
  const id = `field-${name}`;
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

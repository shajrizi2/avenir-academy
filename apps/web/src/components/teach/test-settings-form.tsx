'use client';

import { type StaffTest, TEST_DEFAULTS, testSettingsFields } from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { errorMessage } from '@/lib/api';
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';

/** The form edits local date-times; they are converted to UTC ISO on submit. */
const formSchema = testSettingsFields
  .extend({
    opensAt: z.string().min(1, 'Pick a date and time'),
    closesAt: z.string().min(1, 'Pick a date and time'),
  })
  .refine((v) => new Date(v.closesAt) > new Date(v.opensAt), {
    message: 'The window must close after it opens',
    path: ['closesAt'],
  });
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;
export type TestSettingsValues = z.output<typeof testSettingsFields>;

interface TestSettingsFormProps {
  test: StaffTest | null;
  defaultWindow: { opensAt: string; closesAt: string };
  defaultTitle: string;
  onSubmit: (values: TestSettingsValues) => Promise<unknown>;
}

/** Title, pass mark, time limit, attempts and the window. Creates the test when there is none. */
export function TestSettingsForm({
  test,
  defaultWindow,
  defaultTitle,
  onSubmit,
}: TestSettingsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: test?.title ?? defaultTitle,
      passMark: test?.passMark ?? TEST_DEFAULTS.passMark,
      timeLimitMin: test?.timeLimitMin ?? TEST_DEFAULTS.timeLimitMin,
      maxAttempts: test?.maxAttempts ?? TEST_DEFAULTS.maxAttempts,
      opensAt: isoToLocalInput(test?.opensAt ?? defaultWindow.opensAt),
      closesAt: isoToLocalInput(test?.closesAt ?? defaultWindow.closesAt),
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit({
        ...values,
        opensAt: localInputToIso(values.opensAt),
        closesAt: localInputToIso(values.closesAt),
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <FieldGroup>
        <FormError message={error} />
        <TextField form={form} name="title" label="Title" />
        <div className="grid gap-6 sm:grid-cols-3">
          <TextField form={form} name="passMark" label="Pass mark (%)" type="number" />
          <TextField form={form} name="timeLimitMin" label="Time limit (minutes)" type="number" />
          <TextField form={form} name="maxAttempts" label="Attempts" type="number" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField form={form} name="opensAt" label="Opens" type="datetime-local" />
          <TextField
            form={form}
            name="closesAt"
            label="Closes"
            type="datetime-local"
            description="Your local time. By default, the module’s last week."
          />
        </div>
        <div>
          <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : test ? 'Save settings' : 'Create test'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

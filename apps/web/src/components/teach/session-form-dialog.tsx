'use client';

import {
  type LiveSessionSummary,
  SESSION_DEFAULT_DURATION_MIN,
  sessionSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
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
import { errorMessage } from '@/lib/api';
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';

/** The form edits a local date-time; it is converted to UTC ISO on submit. */
const formSchema = sessionSchema.extend({
  startsAt: z.string().min(1, 'Pick a date and time'),
});
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;
export type SessionValues = z.output<typeof sessionSchema>;

interface SessionFormDialogProps {
  trigger: React.ReactNode;
  title: string;
  session?: LiveSessionSummary;
  onSubmit: (values: SessionValues) => Promise<unknown>;
}

export function SessionFormDialog({ trigger, title, session, onSubmit }: SessionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: session?.title ?? '',
      startsAt: isoToLocalInput(session?.startsAt),
      durationMin: session?.durationMin ?? SESSION_DEFAULT_DURATION_MIN,
      meetUrl: session?.meetUrl ?? '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit({ ...values, startsAt: localInputToIso(values.startsAt) });
      setOpen(false);
      if (!session) form.reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Times are in your local time zone. Students see the Join button 15 minutes before the
            start.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <FormError message={error} />
            <TextField form={form} name="title" label="Title" placeholder="Week 1: How LLMs work" />
            <TextField form={form} name="startsAt" label="Starts at" type="datetime-local" />
            <TextField form={form} name="durationMin" label="Duration (minutes)" type="number" />
            <TextField
              form={form}
              name="meetUrl"
              label="Google Meet link"
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
            />
            <div>
              <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save session'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

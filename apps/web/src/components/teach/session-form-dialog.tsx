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
import { t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';

const m = t.teach.sessions;

/** The form edits a local date-time; it is converted to UTC ISO on submit. */
const formSchema = sessionSchema.extend({
  startsAt: z.string().min(1, 'Zgjidh datën dhe orën'),
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
      // Editing keeps the session in its group; new sessions get one from the API's default.
      groupId: session?.groupId ?? undefined,
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
          <DialogDescription>{m.formHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <FormError message={error} />
            <TextField
              form={form}
              name="title"
              label={m.fieldTitle}
              placeholder={m.titlePlaceholder}
            />
            <TextField form={form} name="startsAt" label={m.startsAt} type="datetime-local" />
            <TextField form={form} name="durationMin" label={m.duration} type="number" />
            <TextField
              form={form}
              name="meetUrl"
              label={m.meetUrl}
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
            />
            <div>
              <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t.common.saving : m.save}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

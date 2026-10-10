'use client';

import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type MessageResponse,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { apiFetch, errorMessage } from '@/lib/api';
import { useHydrated } from '@/lib/use-hydrated';

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  // Until React hydrates, typing is lost and a submit would be a native request, so the
  // form stays disabled until then.
  const hydrated = useHydrated();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await apiFetch<MessageResponse>('/auth/forgot-password', {
        method: 'POST',
        body: values,
      });
      setSent(res.message);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (sent) {
    return (
      <Alert>
        <MailCheck aria-hidden />
        <AlertDescription>{sent} Check your inbox (and spam folder).</AlertDescription>
      </Alert>
    );
  }

  return (
    <form method="post" onSubmit={(e) => void onSubmit(e)} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <FormError message={error} />
          <TextField form={form} name="email" label="Email" type="email" autoComplete="email" />
          <Button
            type="submit"
            variant="chunky"
            size="lg"
            disabled={!hydrated || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}

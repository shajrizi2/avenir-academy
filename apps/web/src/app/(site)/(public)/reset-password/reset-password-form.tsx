'use client';

import {
  type MessageResponse,
  PASSWORD_MIN_LENGTH,
  type ResetPasswordFormInput,
  resetPasswordFormSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { useHydrated } from '@/lib/use-hydrated';

export function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Until React hydrates, typing is lost and a submit would be a native request, so the
  // form stays disabled until then.
  const hydrated = useHydrated();
  const form = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await apiFetch<MessageResponse>('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      toast.success(t.auth.reset.done);
      router.replace('/login');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (!token) {
    return <FormError message={t.auth.reset.invalidLink} />;
  }

  return (
    <form method="post" onSubmit={(e) => void onSubmit(e)} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <FormError message={error} />
          <TextField
            form={form}
            name="password"
            label={t.auth.fields.newPassword}
            type="password"
            autoComplete="new-password"
            description={fmt(t.auth.fields.passwordHint, { min: PASSWORD_MIN_LENGTH })}
          />
          <TextField
            form={form}
            name="confirmPassword"
            label={t.auth.fields.confirmPassword}
            type="password"
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="chunky"
            size="lg"
            disabled={!hydrated || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? t.auth.reset.submitting : t.auth.reset.submit}
          </Button>
          {error && (
            <Link
              href="/forgot-password"
              className="text-ink text-center text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.auth.reset.requestNew}
            </Link>
          )}
        </FieldGroup>
      </fieldset>
    </form>
  );
}

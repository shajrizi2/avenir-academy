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
import { apiFetch, errorMessage } from '@/lib/api';

export function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      const res = await apiFetch<MessageResponse>('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      toast.success(res.message);
      router.replace('/login');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (!token) {
    return (
      <FormError message="This reset link is incomplete. Please request a new one from the forgot password page." />
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate>
      <FieldGroup>
        <FormError message={error} />
        <TextField
          form={form}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
        />
        <TextField
          form={form}
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Update password'}
        </Button>
        {error && (
          <Link
            href="/forgot-password"
            className="text-primary text-center text-sm hover:underline"
          >
            Request a new reset link
          </Link>
        )}
      </FieldGroup>
    </form>
  );
}

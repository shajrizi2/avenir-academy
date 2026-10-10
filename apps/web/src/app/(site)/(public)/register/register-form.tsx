'use client';

import {
  type RegisterFormInput,
  registerFormSchema,
  PASSWORD_MIN_LENGTH,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { track } from '@/lib/analytics';
import { errorMessage } from '@/lib/api';
import { useHydrated } from '@/lib/use-hydrated';
import { useAuth } from '@/lib/auth-context';

type RegisterFormOutput = z.output<typeof registerFormSchema>;

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Until React hydrates, typing is lost and a submit would be a native request, so the
  // form stays disabled until then.
  const hydrated = useHydrated();
  const form = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = form.handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    setError(null);
    try {
      await register(values);
      track('sign_up', { method: 'email' });
      toast.success('Welcome to AI Academy! Pick a course to get started.');
      router.replace('/dashboard');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form method="post" onSubmit={(e) => void onSubmit(e)} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <FormError message={error} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField form={form} name="firstName" label="First name" autoComplete="given-name" />
            <TextField form={form} name="lastName" label="Last name" autoComplete="family-name" />
          </div>
          <TextField form={form} name="email" label="Email" type="email" autoComplete="email" />
          <TextField
            form={form}
            name="phone"
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            placeholder="+383 44 123 456"
          />
          <TextField
            form={form}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            description={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
          />
          <TextField
            form={form}
            name="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="chunky"
            size="lg"
            disabled={!hydrated || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}

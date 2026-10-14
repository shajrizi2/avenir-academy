'use client';

import { type LoginInput, loginSchema } from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { useHydrated } from '@/lib/use-hydrated';
import { useAuth } from '@/lib/auth-context';
import { homeFor, safeNext } from '@/lib/routes';

export function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [error, setError] = useState<string | null>(null);
  // Until React hydrates, typing is lost and a submit would be a native request, so the
  // form stays disabled until then.
  const hydrated = useHydrated();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Already signed in (e.g. session restored from the cookie): skip the form.
  useEffect(() => {
    if (user) router.replace(next ?? homeFor(user.role));
  }, [user, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await login(values);
      router.replace(next ?? homeFor(user.role));
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form method="post" onSubmit={(e) => void onSubmit(e)} noValidate>
      <fieldset disabled={!hydrated} className="min-w-0">
        <FieldGroup>
          <FormError message={error} />
          <TextField
            form={form}
            name="email"
            label={t.auth.fields.email}
            type="email"
            autoComplete="email"
          />
          <TextField
            form={form}
            name="password"
            label={t.auth.fields.password}
            type="password"
            autoComplete="current-password"
          />
          <div className="-mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-ink text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.auth.login.forgot}
            </Link>
          </div>
          <Button
            type="submit"
            variant="chunky"
            size="lg"
            disabled={!hydrated || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? t.auth.login.submitting : t.auth.login.submit}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}

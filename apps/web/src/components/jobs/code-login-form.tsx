'use client';

import {
  type JobSeekerEmailInput,
  type JobSeekerMe,
  type JobSeekerVerifyInput,
  jobSeekerEmailSchema,
  jobSeekerVerifySchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { fmt, t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { emailTypoFix } from '@/lib/job-format';
import { jobSeekerKeys, jobsFetch } from '@/lib/job-seeker';
import { useHydrated } from '@/lib/use-hydrated';

const copy = t.jobs.login;

/**
 * Sign in with an emailed 6-digit code: email (with the email-consent tick, on by default)
 * first, then the code (PLAN D36, D37). Signing in stores the session for a year.
 */
export function CodeLoginForm() {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const consentId = useId();
  const [email, setEmail] = useState<string | null>(null);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<JobSeekerEmailInput>({
    resolver: zodResolver(jobSeekerEmailSchema),
    defaultValues: { email: '' },
  });
  const codeForm = useForm<JobSeekerVerifyInput>({
    resolver: zodResolver(jobSeekerVerifySchema),
    defaultValues: { email: '', code: '' },
  });

  const suggestion = emailTypoFix(emailForm.watch('email'));

  async function sendCode(address: string) {
    setError(null);
    try {
      await jobsFetch('/job-seekers/auth/request-code', {
        method: 'POST',
        body: { email: address },
      });
      setEmail(address);
      codeForm.reset({ email: address, code: '' });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const onEmail = emailForm.handleSubmit((values) => sendCode(values.email));
  const onCode = codeForm.handleSubmit(async (values) => {
    setError(null);
    try {
      const me = await jobsFetch<JobSeekerMe>('/job-seekers/auth/verify', {
        method: 'POST',
        body: { ...values, marketingConsent: consent },
      });
      queryClient.setQueryData(jobSeekerKeys.me, me);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (email === null) {
    return (
      <form method="post" onSubmit={(e) => void onEmail(e)} noValidate>
        <fieldset disabled={!hydrated} className="min-w-0">
          <FieldGroup>
            <FormError message={error} />
            <TextField
              form={emailForm}
              name="email"
              label={copy.email}
              type="email"
              autoComplete="email"
            />
            {suggestion && (
              <p className="text-ink -mt-2 text-sm">
                {fmt(copy.didYouMean, { email: suggestion })}{' '}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-4"
                  onClick={() => emailForm.setValue('email', suggestion, { shouldValidate: true })}
                >
                  {fmt(copy.useSuggestion, { email: suggestion })}
                </button>
              </p>
            )}
            <div className="flex items-start gap-3">
              <Checkbox
                id={consentId}
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
              />
              <Label htmlFor={consentId} className="text-ink text-sm leading-5 font-normal">
                {copy.consent}
              </Label>
            </div>
            <Button
              type="submit"
              variant="chunky"
              size="lg"
              disabled={!hydrated || emailForm.formState.isSubmitting}
            >
              {emailForm.formState.isSubmitting ? copy.sending : copy.send}
            </Button>
            <p className="text-ink-soft text-sm">
              {copy.terms}{' '}
              <Link
                href="/privatesia"
                target="_blank"
                className="text-ink underline underline-offset-4"
              >
                {t.shell.privacy}
              </Link>
            </p>
          </FieldGroup>
        </fieldset>
      </form>
    );
  }

  return (
    <form method="post" onSubmit={(e) => void onCode(e)} noValidate>
      <FieldGroup>
        <p className="text-ink">
          {fmt(copy.sent, { email })}{' '}
          <button
            type="button"
            className="font-semibold underline underline-offset-4"
            onClick={() => {
              setEmail(null);
              setError(null);
            }}
          >
            {copy.change}
          </button>
        </p>
        <FormError message={error} />
        <TextField
          form={codeForm}
          name="code"
          label={copy.code}
          autoComplete="one-time-code"
          description={copy.codeHint}
        />
        <Button type="submit" variant="chunky" size="lg" disabled={codeForm.formState.isSubmitting}>
          {codeForm.formState.isSubmitting ? copy.verifying : copy.verify}
        </Button>
        <button
          type="button"
          className="text-ink text-sm font-semibold underline underline-offset-4"
          onClick={() => void sendCode(email)}
        >
          {copy.resend}
        </button>
      </FieldGroup>
    </form>
  );
}

'use client';

import {
  BIO_MAX_LENGTH,
  type PublicUser,
  type UpdateProfileInput,
  updateProfileSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ProfileOutput = z.output<typeof updateProfileSchema>;

function toFormValues(user: PublicUser): UpdateProfileInput {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? '',
    title: user.title ?? '',
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? '',
    offlineEmailsEnabled: user.offlineEmailsEnabled,
  };
}

export function ProfileForm({ user }: { user: PublicUser }) {
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const offlineId = useId();
  // Instructors appear on the public landing page, so they also manage a public profile.
  const hasPublicProfile = user.role === 'INSTRUCTOR' || user.role === 'ADMIN';
  // Only students receive the offline-learning emails, so only they can switch them off.
  const isStudent = user.role === 'STUDENT';
  const form = useForm<UpdateProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: toFormValues(user),
  });

  const onSubmit = form.handleSubmit(
    async ({ title, bio, avatarUrl, offlineEmailsEnabled, ...values }) => {
      setError(null);
      try {
        // Empty strings clear optional fields on the server.
        const updated = await apiFetch<PublicUser>('/users/me', {
          method: 'PATCH',
          body: {
            ...values,
            phone: values.phone ?? null,
            ...(hasPublicProfile && { title, bio, avatarUrl }),
            ...(isStudent && { offlineEmailsEnabled }),
          },
        });
        setUser(updated);
        form.reset(toFormValues(updated));
        toast.success(t.profile.saved);
      } catch (e) {
        setError(errorMessage(e));
      }
    },
  );

  const bioError = form.formState.errors.bio;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="max-w-xl">
      <FieldGroup>
        <FormError message={error} />
        <Field>
          <FieldLabel htmlFor="email">{t.profile.email}</FieldLabel>
          <Input id="email" value={user.email} disabled readOnly />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            form={form}
            name="firstName"
            label={t.profile.firstName}
            autoComplete="given-name"
          />
          <TextField
            form={form}
            name="lastName"
            label={t.profile.lastName}
            autoComplete="family-name"
          />
        </div>
        <TextField form={form} name="phone" label={t.profile.phone} type="tel" autoComplete="tel" />

        {hasPublicProfile && (
          <FieldSet className="border-t pt-6">
            <FieldLegend>{t.profile.publicProfile}</FieldLegend>
            <FieldDescription>{t.profile.publicProfileHint}</FieldDescription>
            <TextField
              form={form}
              name="title"
              label={t.profile.jobTitle}
              placeholder={t.profile.jobTitlePlaceholder}
            />
            <Field data-invalid={Boolean(bioError)}>
              <FieldLabel htmlFor="field-bio">{t.profile.bio}</FieldLabel>
              <Textarea
                id="field-bio"
                rows={3}
                maxLength={BIO_MAX_LENGTH}
                aria-invalid={Boolean(bioError)}
                {...form.register('bio')}
              />
              {bioError ? (
                <FieldError>{bioError.message}</FieldError>
              ) : (
                <FieldDescription>{t.profile.bioHint}</FieldDescription>
              )}
            </Field>
            <TextField
              form={form}
              name="avatarUrl"
              label={t.profile.avatarUrl}
              type="url"
              placeholder="https://…"
              description={t.profile.avatarHint}
            />
          </FieldSet>
        )}

        {isStudent && (
          <FieldSet className="border-t pt-6">
            <FieldLegend>{t.profile.emails}</FieldLegend>
            <Controller
              control={form.control}
              name="offlineEmailsEnabled"
              render={({ field }) => (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={offlineId}
                    checked={field.value ?? true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor={offlineId}>{t.profile.offlineEmails}</Label>
                    <FieldDescription>{t.profile.offlineEmailsHint}</FieldDescription>
                  </div>
                </div>
              )}
            />
          </FieldSet>
        )}

        <div>
          <Button
            type="submit"
            variant="chunky"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? t.common.saving : t.common.saveChanges}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

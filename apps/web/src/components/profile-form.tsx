'use client';

import {
  BIO_MAX_LENGTH,
  type PublicUser,
  type UpdateProfileInput,
  updateProfileSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
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
  };
}

export function ProfileForm({ user }: { user: PublicUser }) {
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Instructors appear on the public landing page, so they also manage a public profile.
  const hasPublicProfile = user.role === 'INSTRUCTOR' || user.role === 'ADMIN';
  const form = useForm<UpdateProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: toFormValues(user),
  });

  const onSubmit = form.handleSubmit(async ({ title, bio, avatarUrl, ...values }) => {
    setError(null);
    try {
      // Empty strings clear optional fields on the server.
      const updated = await apiFetch<PublicUser>('/users/me', {
        method: 'PATCH',
        body: {
          ...values,
          phone: values.phone ?? null,
          ...(hasPublicProfile && { title, bio, avatarUrl }),
        },
      });
      setUser(updated);
      form.reset(toFormValues(updated));
      toast.success('Profile saved');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const bioError = form.formState.errors.bio;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="max-w-xl">
      <FieldGroup>
        <FormError message={error} />
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={user.email} disabled readOnly />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField form={form} name="firstName" label="First name" autoComplete="given-name" />
          <TextField form={form} name="lastName" label="Last name" autoComplete="family-name" />
        </div>
        <TextField
          form={form}
          name="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
        />

        {hasPublicProfile && (
          <FieldSet className="border-t pt-6">
            <FieldLegend>Public instructor profile</FieldLegend>
            <FieldDescription>
              Shown on the home page next to your name when you teach a module.
            </FieldDescription>
            <TextField
              form={form}
              name="title"
              label="Title"
              placeholder="e.g. AI engineer, 8 years in automation"
            />
            <Field data-invalid={Boolean(bioError)}>
              <FieldLabel htmlFor="field-bio">Short bio</FieldLabel>
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
                <FieldDescription>One or two sentences of experience.</FieldDescription>
              )}
            </Field>
            <TextField
              form={form}
              name="avatarUrl"
              label="Photo URL"
              type="url"
              placeholder="https://…"
              description="A square photo works best."
            />
          </FieldSet>
        )}

        <div>
          <Button
            type="submit"
            variant="chunky"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

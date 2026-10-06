'use client';

import { type PublicUser, type UpdateProfileInput, updateProfileSchema } from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ProfileOutput = z.output<typeof updateProfileSchema>;

export function ProfileForm({ user }: { user: PublicUser }) {
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UpdateProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      // An empty phone clears it on the server.
      const updated = await apiFetch<PublicUser>('/users/me', {
        method: 'PATCH',
        body: { ...values, phone: values.phone ?? null },
      });
      setUser(updated);
      form.reset({
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone ?? '',
      });
      toast.success('Profile saved');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

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
        <div>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

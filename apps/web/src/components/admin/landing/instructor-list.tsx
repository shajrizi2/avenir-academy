'use client';

import { type PublicUser, type UpdateProfileInput, updateProfileSchema } from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Presentation } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PersonAvatar } from '@/components/landing/person-avatar';
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
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, errorMessage } from '@/lib/api';
import { fmt, t } from '@/i18n/messages';
import { instructorsQuery } from '@/lib/queries';

/** The public profile fields shown on the landing page's Instructors section. */
const profileSchema = updateProfileSchema.pick({
  firstName: true,
  lastName: true,
  title: true,
  bio: true,
  avatarUrl: true,
});
type ProfileInput = Pick<
  UpdateProfileInput,
  'firstName' | 'lastName' | 'title' | 'bio' | 'avatarUrl'
>;

export function InstructorList() {
  const { data, isPending, error } = useQuery(instructorsQuery);

  if (isPending) return <Skeleton className="rounded-card h-48 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Presentation}
        title={t.admin.instructors.emptyTitle}
        description={t.admin.instructors.emptyText}
        action={
          <Button asChild variant="chunky">
            <Link href="/admin/users?role=STUDENT">{t.admin.instructors.openUsers}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {data.map((instructor) => {
        const name = `${instructor.firstName} ${instructor.lastName}`;
        return (
          <li
            key={instructor.id}
            className="border-line rounded-card bg-background flex gap-4 border p-5"
          >
            <PersonAvatar name={name} src={instructor.avatarUrl} size={64} className="shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-ink font-bold">{name}</p>
              <p className="text-track-ai-ink text-sm font-semibold">
                {instructor.title ?? t.admin.instructors.noTitle}
              </p>
              <p className="text-ink-soft line-clamp-3 text-sm">
                {instructor.bio ?? t.admin.instructors.noBio}
              </p>
            </div>
            <ProfileDialog instructor={instructor} />
          </li>
        );
      })}
    </ul>
  );
}

function ProfileDialog({ instructor }: { instructor: PublicUser }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ProfileInput, unknown, z.output<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      title: instructor.title ?? '',
      bio: instructor.bio ?? '',
      avatarUrl: instructor.avatarUrl ?? '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch(`/users/${instructor.id}/profile`, { method: 'PATCH', body: values });
      toast.success(t.admin.instructors.saved);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={fmt(t.admin.instructors.editProfile, { name: instructor.firstName })}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.admin.instructors.dialogTitle}</DialogTitle>
          <DialogDescription>{t.admin.instructors.dialogText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <FormError message={error} />
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField form={form} name="firstName" label={t.admin.instructors.firstName} />
              <TextField form={form} name="lastName" label={t.admin.instructors.lastName} />
            </div>
            <TextField
              form={form}
              name="title"
              label={t.admin.instructors.jobTitle}
              placeholder={t.admin.instructors.jobTitlePlaceholder}
            />
            <TextareaField form={form} name="bio" label={t.admin.instructors.bio} rows={3} />
            <TextField
              form={form}
              name="avatarUrl"
              label={t.admin.instructors.avatarUrl}
              type="url"
            />
            <div>
              <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t.common.saving : t.admin.instructors.save}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

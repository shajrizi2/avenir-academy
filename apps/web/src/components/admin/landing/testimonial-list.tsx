'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Quote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-error';
import { PersonAvatar } from '@/components/landing/person-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, errorMessage } from '@/lib/api';
import { fmt, t } from '@/i18n/messages';
import { adminTestimonialsQuery } from '@/lib/queries';
import { TestimonialFormDialog, type TestimonialValues } from './testimonial-form-dialog';

export function TestimonialList() {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(adminTestimonialsQuery);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['testimonials'] });

  async function create(values: TestimonialValues) {
    await apiFetch('/testimonials', { method: 'POST', body: values });
    toast.success(t.admin.testimonials.saved);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <TestimonialFormDialog
        title={t.admin.testimonials.new}
        onSubmit={create}
        trigger={
          <Button variant="chunky">
            <Plus data-icon="inline-start" /> {t.admin.testimonials.new}
          </Button>
        }
      />
      {isPending ? (
        <Skeleton className="rounded-card h-48 w-full" />
      ) : error ? (
        <FormError message={errorMessage(error)} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Quote}
          title={t.admin.testimonials.emptyTitle}
          description={t.admin.testimonials.emptyText}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((item) => (
            <li
              key={item.id}
              className="border-line rounded-card bg-background flex flex-col gap-4 border p-5"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant={item.isPublished ? 'ai' : 'secondary'}>
                  {item.isPublished ? t.admin.testimonials.published : t.admin.testimonials.draft}
                </Badge>
                <Badge variant="outline">
                  {item.locale === 'sq'
                    ? t.admin.testimonials.albanian
                    : t.admin.testimonials.english}
                </Badge>
              </div>
              <blockquote className="text-ink flex-1 leading-7">“{item.quote}”</blockquote>
              <div className="flex items-center gap-3">
                <PersonAvatar name={item.name} src={item.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-bold">{item.name}</p>
                  {item.role && <p className="text-ink-soft text-sm">{item.role}</p>}
                </div>
                <TestimonialFormDialog
                  title={t.admin.testimonials.edit}
                  testimonial={item}
                  onSubmit={async (values) => {
                    await apiFetch(`/testimonials/${item.id}`, { method: 'PATCH', body: values });
                    toast.success(t.admin.testimonials.saved);
                    await refresh();
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={fmt(t.admin.testimonials.editFrom, { name: item.name })}
                    >
                      <Pencil />
                    </Button>
                  }
                />
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={fmt(t.admin.testimonials.deleteFrom, { name: item.name })}
                    >
                      <Trash2 />
                    </Button>
                  }
                  title={t.admin.testimonials.deleteTitle}
                  description={t.admin.testimonials.deleteText}
                  confirmLabel={t.common.delete}
                  onConfirm={async () => {
                    try {
                      await apiFetch(`/testimonials/${item.id}`, { method: 'DELETE' });
                      toast.success(t.admin.testimonials.deleted);
                      await refresh();
                    } catch (e) {
                      toast.error(errorMessage(e));
                      throw e;
                    }
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

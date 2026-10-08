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
import { adminTestimonialsQuery } from '@/lib/queries';
import { TestimonialFormDialog, type TestimonialValues } from './testimonial-form-dialog';

export function TestimonialList() {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(adminTestimonialsQuery);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['testimonials'] });

  async function create(values: TestimonialValues) {
    await apiFetch('/testimonials', { method: 'POST', body: values });
    toast.success('Testimonial saved');
    await refresh();
  }

  return (
    <div className="space-y-6">
      <TestimonialFormDialog
        title="New testimonial"
        onSubmit={create}
        trigger={
          <Button variant="chunky">
            <Plus data-icon="inline-start" /> New testimonial
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
          title="No testimonials yet"
          description="The landing page hides the testimonials section until at least one is published."
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
                  {item.isPublished ? 'Published' : 'Draft'}
                </Badge>
                <Badge variant="outline">{item.locale === 'sq' ? 'Albanian' : 'English'}</Badge>
              </div>
              <blockquote className="text-ink flex-1 leading-7">“{item.quote}”</blockquote>
              <div className="flex items-center gap-3">
                <PersonAvatar name={item.name} src={item.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-bold">{item.name}</p>
                  {item.role && <p className="text-ink-soft text-sm">{item.role}</p>}
                </div>
                <TestimonialFormDialog
                  title="Edit testimonial"
                  testimonial={item}
                  onSubmit={async (values) => {
                    await apiFetch(`/testimonials/${item.id}`, { method: 'PATCH', body: values });
                    toast.success('Testimonial saved');
                    await refresh();
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit testimonial from ${item.name}`}
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
                      aria-label={`Delete testimonial from ${item.name}`}
                    >
                      <Trash2 />
                    </Button>
                  }
                  title="Delete this testimonial?"
                  description="It disappears from the landing page right away."
                  confirmLabel="Delete"
                  onConfirm={async () => {
                    try {
                      await apiFetch(`/testimonials/${item.id}`, { method: 'DELETE' });
                      toast.success('Testimonial deleted');
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

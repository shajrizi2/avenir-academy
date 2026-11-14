'use client';

import {
  type AdminCampaign,
  type AdminSubscribers,
  type CampaignInput,
  campaignSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormError } from '@/components/form-error';
import { TextareaField } from '@/components/form/textarea-field';
import { TextField } from '@/components/form/text-field';
import { LocalDateTime } from '@/components/local-date-time';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, t } from '@/i18n/messages';
import { apiFetch, errorMessage } from '@/lib/api';

const c = t.adminCampaigns;
const KEY = ['admin-campaigns'] as const;

/** Email campaigns to job seekers who ticked "emails from Avenir" (PLAN D37). */
export function CampaignList() {
  const queryClient = useQueryClient();
  const campaigns = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<AdminCampaign[]>('/admin/campaigns'),
    // While one is sending, its progress moves every minute.
    refetchInterval: (query) =>
      query.state.data?.some((x) => x.status === 'SENDING') ? 30_000 : false,
  });
  const subscribers = useQuery({
    queryKey: ['admin-subscribers'],
    queryFn: () => apiFetch<AdminSubscribers>('/admin/subscribers'),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  async function act(run: () => Promise<unknown>, success?: string) {
    try {
      const result = (await run()) as { message?: string } | undefined;
      toast.success(success ?? result?.message ?? c.saved);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <>
      <PageHeader title={c.title} description={c.description} />
      <NewCampaign
        onCreate={(values) =>
          act(() => apiFetch('/admin/campaigns', { method: 'POST', body: values }), c.saved)
        }
      />
      {campaigns.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : campaigns.error ? (
        <FormError message={errorMessage(campaigns.error)} />
      ) : campaigns.data.length === 0 ? (
        <p className="text-ink-soft">{c.empty}</p>
      ) : (
        <ul className="space-y-4">
          {campaigns.data.map((campaign) => (
            <li key={campaign.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle as="h2">{campaign.subject}</CardTitle>
                    <Badge variant="secondary">{c.status[campaign.status]}</Badge>
                  </div>
                  <p className="text-ink-soft text-sm">
                    <LocalDateTime value={campaign.startedAt ?? campaign.createdAt} />
                    {campaign.status !== 'DRAFT' && (
                      <>
                        {' · '}
                        {fmt(c.progress, { sent: campaign.sent, recipients: campaign.recipients })}
                        {campaign.failed > 0 && ` · ${fmt(c.failed, { count: campaign.failed })}`}
                      </>
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-ink-soft line-clamp-3 text-sm whitespace-pre-line">
                    {campaign.body}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.status === 'DRAFT' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() =>
                            void act(() =>
                              apiFetch(`/admin/campaigns/${campaign.id}/test`, { method: 'POST' }),
                            ).catch(() => undefined)
                          }
                        >
                          {c.test}
                        </Button>
                        <ConfirmDialog
                          trigger={<Button variant="chunky">{c.send}</Button>}
                          title={c.sendTitle}
                          description={fmt(c.sendDescription, {
                            count: subscribers.data?.consenting ?? 0,
                          })}
                          confirmLabel={c.send}
                          confirmVariant="chunky"
                          onConfirm={() =>
                            act(
                              () =>
                                apiFetch(`/admin/campaigns/${campaign.id}/send`, {
                                  method: 'POST',
                                }),
                              c.status.SENDING,
                            )
                          }
                        />
                        <ConfirmDialog
                          trigger={<Button variant="ghost">{c.delete}</Button>}
                          title={c.delete}
                          description={campaign.subject}
                          confirmLabel={c.delete}
                          onConfirm={() =>
                            act(() =>
                              apiFetch(`/admin/campaigns/${campaign.id}`, { method: 'DELETE' }),
                            )
                          }
                        />
                      </>
                    )}
                    {campaign.status === 'SENDING' && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          void act(
                            () =>
                              apiFetch(`/admin/campaigns/${campaign.id}/cancel`, {
                                method: 'POST',
                              }),
                            c.status.CANCELLED,
                          ).catch(() => undefined)
                        }
                      >
                        {c.cancel}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NewCampaign({ onCreate }: { onCreate: (values: CampaignInput) => Promise<void> }) {
  const form = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { subject: '', body: '' },
  });
  const submit = form.handleSubmit(async (values) => {
    await onCreate(values).then(
      () => form.reset(),
      () => undefined,
    );
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{c.new}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <TextField form={form} name="subject" label={c.subject} />
            <TextareaField
              form={form}
              name="body"
              label={c.body}
              description={c.bodyHint}
              rows={8}
            />
            <Button
              type="submit"
              variant="chunky"
              disabled={form.formState.isSubmitting}
              className="self-start"
            >
              {c.save}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

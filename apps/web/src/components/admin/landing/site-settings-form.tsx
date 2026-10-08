'use client';

import { type SiteSettings, type SiteSettingsInput, siteSettingsSchema } from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, errorMessage } from '@/lib/api';
import { isoToLocalInput, localInputToIso } from '@/lib/datetime';
import { siteSettingsQuery } from '@/lib/queries';
import { toast } from 'sonner';

type Values = z.output<typeof siteSettingsSchema>;

export function SiteSettingsForm() {
  const { data, isPending, error } = useQuery(siteSettingsQuery);
  if (isPending) return <Skeleton className="rounded-card h-96 w-full" />;
  if (error) return <FormError message={errorMessage(error)} />;
  return <SettingsForm key={JSON.stringify(data)} settings={data} />;
}

/** null → '' for the inputs; '' → null for the API (clears the value). */
const text = (value: string | number | null) => (value === null ? '' : String(value));
const orNull = <T,>(value: T | '' | undefined): T | null =>
  value === '' || value === undefined ? null : value;

function SettingsForm({ settings }: { settings: SiteSettings }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SiteSettingsInput, unknown, Values>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      nextCohortStart: isoToLocalInput(settings.nextCohortStart),
      scheduleSq: text(settings.scheduleSq),
      scheduleEn: text(settings.scheduleEn),
      seatsTotal: text(settings.seatsTotal),
      priceAmount: text(settings.priceAmount),
      priceCurrency: settings.priceCurrency,
      priceNoteSq: text(settings.priceNoteSq),
      priceNoteEn: text(settings.priceNoteEn),
      contactEmail: text(settings.contactEmail),
      contactPhone: text(settings.contactPhone),
      whatsappNumber: text(settings.whatsappNumber),
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await apiFetch<SiteSettings>('/site-settings', {
        method: 'PATCH',
        body: {
          nextCohortStart: values.nextCohortStart ? localInputToIso(values.nextCohortStart) : null,
          scheduleSq: orNull(values.scheduleSq),
          scheduleEn: orNull(values.scheduleEn),
          seatsTotal: orNull(values.seatsTotal),
          priceAmount: orNull(values.priceAmount),
          priceCurrency: values.priceCurrency,
          priceNoteSq: orNull(values.priceNoteSq),
          priceNoteEn: orNull(values.priceNoteEn),
          contactEmail: orNull(values.contactEmail),
          contactPhone: orNull(values.contactPhone),
          whatsappNumber: orNull(values.whatsappNumber),
        },
      });
      toast.success('Saved. The landing page shows the new values on the next visit.');
      queryClient.setQueryData(siteSettingsQuery.queryKey, saved);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
      <FormError message={error} />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Next cohort</CardTitle>
            <CardDescription>
              Shown in the hero badge and the “Next cohort” section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField
                form={form}
                name="nextCohortStart"
                label="Start date and time"
                type="datetime-local"
              />
              <TextField
                form={form}
                name="scheduleSq"
                label="Schedule (Albanian)"
                placeholder="2 mbrëmje në javë, 19:00–20:30"
              />
              <TextField
                form={form}
                name="scheduleEn"
                label="Schedule (English)"
                placeholder="2 evenings a week, 19:00–20:30"
              />
              <TextField form={form} name="seatsTotal" label="Seats per cohort" type="number" />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">Price</CardTitle>
            <CardDescription>
              Leave the amount empty to show “Contact us for pricing”.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField
                form={form}
                name="priceAmount"
                label="Amount (whole units)"
                type="number"
              />
              <TextField form={form} name="priceCurrency" label="Currency" placeholder="EUR" />
              <TextField
                form={form}
                name="priceNoteSq"
                label="Price note (Albanian)"
                placeholder="për modul"
              />
              <TextField
                form={form}
                name="priceNoteEn"
                label="Price note (English)"
                placeholder="per module"
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle as="h2">Contact</CardTitle>
            <CardDescription>Shown in the final call-to-action and the footer.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-6 md:grid-cols-3">
              <TextField form={form} name="contactEmail" label="Email" type="email" />
              <TextField
                form={form}
                name="contactPhone"
                label="Phone"
                type="tel"
                placeholder="+383 44 000 000"
              />
              <TextField
                form={form}
                name="whatsappNumber"
                label="WhatsApp number"
                placeholder="38344000000"
                description="Digits only, with the country code."
              />
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      <Button
        type="submit"
        variant="chunky"
        size="lg"
        disabled={form.formState.isSubmitting || !form.formState.isDirty}
      >
        {form.formState.isSubmitting ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}

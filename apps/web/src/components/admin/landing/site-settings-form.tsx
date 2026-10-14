'use client';

import { type SiteSettings, type SiteSettingsInput, siteSettingsSchema } from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n/messages';
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
  const stripeId = useId();
  const bankId = useId();
  const s = t.admin.settings;
  const p = t.adminLaunch.settings;
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
      stripeEnabled: settings.stripeEnabled,
      bankTransferEnabled: settings.bankTransferEnabled,
      bankBeneficiary: text(settings.bankBeneficiary),
      bankIban: text(settings.bankIban),
      bankName: text(settings.bankName),
      bankSwift: text(settings.bankSwift),
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
          stripeEnabled: values.stripeEnabled,
          bankTransferEnabled: values.bankTransferEnabled,
          bankBeneficiary: orNull(values.bankBeneficiary),
          bankIban: orNull(values.bankIban),
          bankName: orNull(values.bankName),
          bankSwift: orNull(values.bankSwift),
        },
      });
      toast.success(s.saved);
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
            <CardTitle as="h2">{p.payments}</CardTitle>
            <CardDescription>{p.paymentsHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="stripeEnabled"
                render={({ field }) => (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={stripeId}
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={stripeId}>{p.stripeEnabled}</Label>
                      <p className="text-ink-soft text-sm">{p.stripeHint}</p>
                    </div>
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="bankTransferEnabled"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={bankId}
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    <Label htmlFor={bankId}>{p.bankEnabled}</Label>
                  </div>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">{p.bank}</CardTitle>
            <CardDescription>{p.bankHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField form={form} name="bankBeneficiary" label={p.beneficiary} />
              <TextField form={form} name="bankIban" label={p.iban} />
              <TextField form={form} name="bankName" label={p.bankName} />
              <TextField form={form} name="bankSwift" label={p.swift} />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">{s.nextCohort}</CardTitle>
            <CardDescription>{s.nextCohortHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField
                form={form}
                name="nextCohortStart"
                label={s.startDateTime}
                type="datetime-local"
              />
              <TextField
                form={form}
                name="scheduleSq"
                label={s.scheduleSq}
                placeholder={s.scheduleSqPlaceholder}
              />
              <TextField
                form={form}
                name="scheduleEn"
                label={s.scheduleEn}
                placeholder={s.scheduleEnPlaceholder}
              />
              <TextField form={form} name="seatsTotal" label={s.seatsTotal} type="number" />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle as="h2">{s.price}</CardTitle>
            <CardDescription>{s.priceHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField form={form} name="priceAmount" label={s.priceAmount} type="number" />
              <TextField form={form} name="priceCurrency" label={s.currency} placeholder="EUR" />
              <TextField
                form={form}
                name="priceNoteSq"
                label={s.priceNoteSq}
                placeholder={s.priceNoteSqPlaceholder}
              />
              <TextField
                form={form}
                name="priceNoteEn"
                label={s.priceNoteEn}
                placeholder={s.priceNoteEnPlaceholder}
              />
            </FieldGroup>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle as="h2">{s.contact}</CardTitle>
            <CardDescription>{s.contactHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-6 md:grid-cols-3">
              <TextField form={form} name="contactEmail" label={s.contactEmail} type="email" />
              <TextField
                form={form}
                name="contactPhone"
                label={s.contactPhone}
                type="tel"
                placeholder="+383 44 000 000"
              />
              <TextField
                form={form}
                name="whatsappNumber"
                label={s.whatsapp}
                placeholder="38344000000"
                description={s.whatsappHint}
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
        {form.formState.isSubmitting ? t.common.saving : s.save}
      </Button>
    </form>
  );
}

'use client';

import {
  MODULE_DEFAULT_DURATION_WEEKS,
  type ModuleInput,
  type ModuleSummary,
  moduleSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { FormError } from '@/components/form-error';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { TextareaField } from '@/components/form/textarea-field';
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
import { errorMessage } from '@/lib/api';
import { t } from '@/i18n/messages';
import { instructorsQuery } from '@/lib/queries';

interface ModuleFormDialogProps {
  trigger: React.ReactNode;
  title: string;
  module?: ModuleSummary;
  onSubmit: (input: z.output<typeof moduleSchema>) => Promise<unknown>;
}

/** Create or edit a module, including which instructor teaches it. */
export function ModuleFormDialog({ trigger, title, module, onSubmit }: ModuleFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const instructors = useQuery({ ...instructorsQuery, enabled: open });
  const form = useForm<ModuleInput, unknown, z.output<typeof moduleSchema>>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: module?.title ?? '',
      description: module?.description ?? '',
      titleSq: module?.titleSq ?? '',
      descriptionSq: module?.descriptionSq ?? '',
      durationWeeks: module?.durationWeeks ?? MODULE_DEFAULT_DURATION_WEEKS,
      instructorId: module?.instructor?.id ?? '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit(values);
      setOpen(false);
      if (!module) form.reset();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const options = [
    { value: '', label: t.admin.courses.moduleDialog.notAssigned },
    ...(instructors.data ?? []).map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName}`,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t.admin.courses.moduleDialog.text}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} noValidate>
          <FieldGroup>
            <FormError message={error} />
            <TextField form={form} name="title" label={t.admin.courses.moduleDialog.titleField} />
            <TextareaField
              form={form}
              name="description"
              label={t.admin.courses.moduleDialog.descriptionField}
              rows={4}
            />
            <TextField
              form={form}
              name="titleSq"
              label={t.admin.courses.moduleDialog.titleSq}
              description={t.admin.courses.moduleDialog.titleSqHint}
            />
            <TextareaField
              form={form}
              name="descriptionSq"
              label={t.admin.courses.moduleDialog.descriptionSq}
              rows={3}
            />
            <TextField
              form={form}
              name="durationWeeks"
              label={t.admin.courses.moduleDialog.duration}
              type="number"
            />
            <SelectField
              form={form}
              name="instructorId"
              label={t.admin.courses.moduleDialog.instructorField}
              options={options}
              description={
                instructors.data?.length === 0
                  ? t.admin.courses.moduleDialog.noInstructors
                  : undefined
              }
            />
            <div>
              <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t.common.saving : t.admin.courses.moduleDialog.save}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

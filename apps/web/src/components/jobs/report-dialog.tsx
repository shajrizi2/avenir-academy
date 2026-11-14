'use client';

import { JOB_REPORT_REASONS, type JobReportReason } from '@ai-academy/shared';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { t } from '@/i18n/messages';
import { errorMessage } from '@/lib/api';
import { useReportJob } from '@/lib/job-seeker';

export function ReportDialog({
  jobId,
  open,
  onOpenChange,
}: {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<JobReportReason>('SCAM');
  const report = useReportJob();
  const name = useId();

  async function send() {
    try {
      await report.mutateAsync({ jobId, reason });
      toast.success(t.jobs.reported);
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.jobs.reportTitle}</DialogTitle>
          <DialogDescription>{t.jobs.reportDescription}</DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-1">
          <legend className="sr-only">{t.jobs.reportTitle}</legend>
          {JOB_REPORT_REASONS.map((value) => (
            <label
              key={value}
              className="hover:bg-soft flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3"
            >
              <input
                type="radio"
                name={name}
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-ink size-4"
              />
              <span className="text-ink">{t.jobs.reportReasons[value]}</span>
            </label>
          ))}
        </fieldset>
        <DialogFooter>
          <Button variant="chunky" onClick={() => void send()} disabled={report.isPending}>
            {t.jobs.reportSend}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

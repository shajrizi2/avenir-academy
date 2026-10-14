import type { EnrollmentStatus } from '@ai-academy/shared';
import { t } from '@/i18n/messages';
import { cn } from '@/lib/utils';

const STYLES: Record<EnrollmentStatus, string> = {
  PENDING: 'bg-active-tint text-active-ink',
  PENDING_PAYMENT: 'bg-active-tint text-active-ink',
  APPROVED: 'bg-passed-tint text-passed-ink',
  REJECTED: 'bg-failed-tint text-failed-ink',
  CANCELLED: 'bg-locked-tint text-locked-ink',
  WAITLISTED: 'bg-locked-tint text-locked-ink',
  EXPIRED: 'bg-failed-tint text-failed-ink',
};

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        STYLES[status],
      )}
    >
      {t.status.enrollment[status]}
    </span>
  );
}

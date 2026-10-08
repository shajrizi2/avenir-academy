import type { EnrollmentStatus } from '@ai-academy/shared';
import { cn } from '@/lib/utils';

const STYLES: Record<EnrollmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending approval', className: 'bg-active-tint text-active-ink' },
  APPROVED: { label: 'Enrolled', className: 'bg-passed-tint text-passed-ink' },
  REJECTED: { label: 'Declined', className: 'bg-failed-tint text-failed-ink' },
  CANCELLED: { label: 'Cancelled', className: 'bg-locked-tint text-locked-ink' },
};

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold',
        className,
      )}
    >
      {label}
    </span>
  );
}

import type { EnrollmentStatus } from '@ai-academy/shared';
import { cn } from '@/lib/utils';

const STYLES: Record<EnrollmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending approval', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  APPROVED: { label: 'Enrolled', className: 'bg-green-50 text-green-700 ring-green-600/20' },
  REJECTED: { label: 'Declined', className: 'bg-red-50 text-red-700 ring-red-600/20' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
};

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        className,
      )}
    >
      {label}
    </span>
  );
}

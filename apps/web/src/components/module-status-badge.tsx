import type { ModuleStatus } from '@ai-academy/shared';
import { CheckCircle2, CircleDot, Lock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ModuleStatus, { label: string; className: string; Icon: typeof Lock }> =
  {
    PASSED: {
      label: 'Passed',
      className: 'bg-green-50 text-green-700 ring-green-600/20',
      Icon: CheckCircle2,
    },
    ACTIVE: {
      label: 'Active',
      className: 'bg-amber-50 text-amber-800 ring-amber-600/20',
      Icon: CircleDot,
    },
    LOCKED: {
      label: 'Locked',
      className: 'bg-slate-100 text-slate-600 ring-slate-500/20',
      Icon: Lock,
    },
    FAILED: { label: 'Failed', className: 'bg-red-50 text-red-700 ring-red-600/20', Icon: XCircle },
  };

/** The single, consistent way to show a module's status everywhere in the app. */
export function ModuleStatusBadge({
  status,
  className,
}: {
  status: ModuleStatus;
  className?: string;
}) {
  const { label, className: tone, Icon } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

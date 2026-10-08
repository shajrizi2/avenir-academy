import type { ModuleStatus } from '@ai-academy/shared';
import { CheckCircle2, CircleDot, Lock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ModuleStatus, { label: string; className: string; Icon: typeof Lock }> =
  {
    PASSED: { label: 'Passed', className: 'bg-passed-tint text-passed-ink', Icon: CheckCircle2 },
    ACTIVE: { label: 'Active', className: 'bg-active-tint text-active-ink', Icon: CircleDot },
    LOCKED: { label: 'Locked', className: 'bg-locked-tint text-locked-ink', Icon: Lock },
    FAILED: { label: 'Failed', className: 'bg-failed-tint text-failed-ink', Icon: XCircle },
  };

/** The single, consistent way to show a module's status everywhere in the app. */
interface ModuleStatusBadgeProps {
  status: ModuleStatus;
  /** Override the English label (e.g. translated copy on the landing page). */
  label?: string;
  className?: string;
}

export function ModuleStatusBadge({ status, label, className }: ModuleStatusBadgeProps) {
  const { label: defaultLabel, className: tone, Icon } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold',
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label ?? defaultLabel}
    </span>
  );
}

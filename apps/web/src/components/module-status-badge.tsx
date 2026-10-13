import type { ModuleStatus } from '@ai-academy/shared';
import { CheckCircle2, CircleDot, Lock, XCircle } from 'lucide-react';
import { t } from '@/i18n/messages';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ModuleStatus, { className: string; Icon: typeof Lock }> = {
  PASSED: { className: 'bg-passed-tint text-passed-ink', Icon: CheckCircle2 },
  ACTIVE: { className: 'bg-active-tint text-active-ink', Icon: CircleDot },
  LOCKED: { className: 'bg-locked-tint text-locked-ink', Icon: Lock },
  FAILED: { className: 'bg-failed-tint text-failed-ink', Icon: XCircle },
};

/** The single, consistent way to show a module's status everywhere in the app. */
interface ModuleStatusBadgeProps {
  status: ModuleStatus;
  /** Override the label (e.g. a shorter form in a tight layout). */
  label?: string;
  className?: string;
}

export function ModuleStatusBadge({ status, label, className }: ModuleStatusBadgeProps) {
  const { className: tone, Icon } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold',
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label ?? t.status.module[status]}
    </span>
  );
}

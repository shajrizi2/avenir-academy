import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-white px-6 py-12 text-center">
      <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-medium text-slate-900">{title}</h2>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

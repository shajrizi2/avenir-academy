import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border-line-strong rounded-card bg-background flex flex-col items-center gap-4 border-2 border-dashed px-6 py-12 text-center">
      <span className="bg-track-ai-tint text-track-ai-ink flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="text-ink text-lg font-bold">{title}</h2>
        <p className="text-ink-soft mx-auto max-w-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

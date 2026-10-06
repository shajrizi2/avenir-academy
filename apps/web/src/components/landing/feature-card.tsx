import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

/**
 * Icon + title + one or two lines; used by the why-now, audience and benefits grids.
 * On phones the icon sits beside the text to keep long lists compact.
 */
export function FeatureCard({ icon: Icon, title, text }: FeatureCardProps) {
  return (
    <div className="reveal flex h-full gap-4 rounded-xl border bg-white p-5 sm:flex-col sm:gap-0 sm:p-6">
      <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h3 className="font-semibold text-slate-900 sm:mt-4">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-slate-600 sm:mt-2">{text}</p>
      </div>
    </div>
  );
}

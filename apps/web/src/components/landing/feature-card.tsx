import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Icon tile colours, cycled so neighbouring cards differ. */
const TONES = [
  'bg-track-ai-tint text-track-ai-ink',
  'bg-track-marketing-tint text-track-marketing-ink',
  'bg-passed-tint text-passed-ink',
  'bg-active-tint text-active-ink',
];

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
  /** Index used to pick the icon tile colour. */
  tone?: number;
}

/**
 * Icon + title + one or two lines; used by the why-now, audience and benefits grids.
 * On phones the icon sits beside the text to keep long lists compact.
 */
export function FeatureCard({ icon: Icon, title, text, tone = 0 }: FeatureCardProps) {
  return (
    <div className="reveal border-line rounded-card bg-background flex h-full gap-4 border p-5 sm:flex-col sm:gap-0 sm:p-6">
      <span
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-xl',
          TONES[tone % TONES.length],
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <h3 className="text-ink text-lg font-bold sm:mt-5">{title}</h3>
        <p className="text-ink-soft mt-1.5 leading-7 sm:mt-2">{text}</p>
      </div>
    </div>
  );
}

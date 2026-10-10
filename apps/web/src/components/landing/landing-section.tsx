import { cn } from '@/lib/utils';

interface LandingSectionProps {
  id: string;
  /** Sections alternate white / warm off-white backgrounds. */
  tone?: 'white' | 'soft';
  eyebrow: string;
  title: string;
  intro?: string;
  className?: string;
  children: React.ReactNode;
}

export function LandingSection({
  id,
  tone = 'white',
  eyebrow,
  title,
  intro,
  className,
  children,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-tone={tone}
      className={cn(
        // Two sections with the same background in a row (an optional one is hidden): divide them.
        'border-line scroll-mt-16 py-16 lg:py-28 [[data-tone=soft]+&[data-tone=soft]]:border-t [[data-tone=white]+&[data-tone=white]]:border-t',
        tone === 'soft' ? 'bg-soft' : 'bg-background',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <SectionHeading id={id} eyebrow={eyebrow} title={title} intro={intro} />
        <div className="mt-12 lg:mt-16">{children}</div>
      </div>
    </section>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
}: Pick<LandingSectionProps, 'id' | 'eyebrow' | 'title' | 'intro'>) {
  return (
    <header className="reveal mx-auto max-w-3xl text-center">
      <p className="text-track-ai-ink text-sm font-bold tracking-wide uppercase">{eyebrow}</p>
      <h2
        id={`${id}-title`}
        className="text-ink text-heading lg:text-title mt-3 font-extrabold text-balance"
      >
        {title}
      </h2>
      {intro && <p className="text-ink-soft mt-4 text-lg text-pretty">{intro}</p>}
    </header>
  );
}

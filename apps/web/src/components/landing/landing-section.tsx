import { cn } from '@/lib/utils';

interface LandingSectionProps {
  id: string;
  /** Sections alternate white / slate-50 backgrounds. */
  tone?: 'white' | 'muted';
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
        'landing-section scroll-mt-16 py-16 sm:py-24',
        tone === 'muted' ? 'bg-slate-50' : 'bg-white',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        <header className="reveal mx-auto max-w-2xl text-center">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
          <h2
            id={`${id}-title`}
            className="mt-3 text-3xl font-semibold tracking-tight text-balance text-slate-900 sm:text-4xl"
          >
            {title}
          </h2>
          {intro && <p className="mt-4 text-lg text-pretty text-slate-600">{intro}</p>}
        </header>
        <div className="mt-12 sm:mt-16">{children}</div>
      </div>
    </section>
  );
}

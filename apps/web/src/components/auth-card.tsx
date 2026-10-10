import type { IllustrationProps } from '@/components/illustrations/svg';

interface AuthCardProps {
  title: string;
  description: string;
  /** A small illustration above the card. */
  illustration: React.ComponentType<IllustrationProps>;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centered card on the off-white page background, used by every auth page. */
export function AuthCard({
  title,
  description,
  illustration: Illustration,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <Illustration className="mx-auto w-40" />
      <div className="border-line-strong rounded-card bg-background mt-6 border-2 p-6 shadow-[0_4px_0_var(--border-strong)] sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-ink text-subheading sm:text-heading font-extrabold">{title}</h1>
          <p className="text-ink-soft">{description}</p>
        </div>
        {children}
      </div>
      {footer && <div className="text-ink-soft mt-6 text-center text-sm">{footer}</div>}
    </div>
  );
}

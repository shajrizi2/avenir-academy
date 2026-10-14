import Link from 'next/link';

/** Our mark: three rising steps (one module at a time) on an ink tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" className="fill-ink" />
      <rect x="7" y="18" width="5" height="7" rx="1.5" className="fill-track-marketing" />
      <rect x="13.5" y="13" width="5" height="12" rx="1.5" className="fill-track-ai" />
      <rect x="20" y="7" width="5" height="18" rx="1.5" className="fill-background" />
    </svg>
  );
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="text-ink tracking-heading flex items-center gap-2 rounded-lg text-lg font-extrabold"
    >
      <LogoMark className="size-8" />
      <span>Avenir Academy</span>
    </Link>
  );
}

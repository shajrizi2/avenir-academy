'use client';

import type { VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import { Button, type buttonVariants } from '@/components/ui/button';
import { track } from '@/lib/analytics';

interface CtaLinkProps extends VariantProps<typeof buttonVariants> {
  href: string;
  /** Stable analytics id, e.g. "hero_register". */
  cta: string;
  locale: string;
  className?: string;
  children: React.ReactNode;
}

/** A call-to-action link styled as a button that reports every click to `track()`. */
export function CtaLink({ href, cta, locale, className, variant, size, children }: CtaLinkProps) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={href} onClick={() => track('cta_click', { cta, href, locale })}>
        {children}
      </Link>
    </Button>
  );
}

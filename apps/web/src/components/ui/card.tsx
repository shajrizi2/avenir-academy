import * as React from 'react';
import { cn } from '@/lib/utils';

const cardVariants = {
  /** Static content: 1px border, no shadow. */
  default: 'border border-line',
  /** Clickable card: 2px outline and a solid bottom shadow that lifts on hover. */
  pressable:
    'pressable border-line-strong [--press:var(--border-strong)] hover:border-ink hover:[--press:var(--ink)]',
} as const;

function Card({
  className,
  size = 'default',
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  variant?: keyof typeof cardVariants;
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        'group/card bg-card text-card-foreground rounded-card flex flex-col gap-(--card-spacing) overflow-hidden py-(--card-spacing) text-sm [--card-spacing:--spacing(6)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-card *:[img:last-child]:rounded-b-card',
        cardVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-card px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

/** A div by default; pass `as="h2"` (or h3) when the title heads a page section. */
function CardTitle({
  className,
  as: Comp = 'div',
  ...props
}: React.ComponentProps<'div'> & { as?: 'div' | 'h2' | 'h3' }) {
  return (
    <Comp
      data-slot="card-title"
      className={cn(
        'font-heading tracking-heading text-lg leading-snug font-bold group-data-[size=sm]/card:text-base',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'bg-soft flex items-center rounded-b-card border-t p-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

export { Card, cardVariants, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };

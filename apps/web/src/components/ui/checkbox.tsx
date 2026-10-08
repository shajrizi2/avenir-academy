'use client';

import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'border-line-strong bg-background data-[state=checked]:border-passed-ink data-[state=checked]:bg-passed text-primary-foreground focus-visible:ring-ring/50 peer flex size-6 shrink-0 items-center justify-center rounded-md border-2 outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        <CheckIcon className="size-4" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

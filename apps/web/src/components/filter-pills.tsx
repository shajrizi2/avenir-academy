'use client';

import { cn } from '@/lib/utils';

interface FilterPillsProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of pill toggles for filtering a list (one selected at a time). */
export function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterPillsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'focus-visible:ring-ring/50 h-10 rounded-full border-2 px-4 text-sm font-bold outline-none focus-visible:ring-3',
            value === option.value
              ? 'border-ink bg-ink text-primary-foreground'
              : 'border-line-strong bg-background text-ink hover:border-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

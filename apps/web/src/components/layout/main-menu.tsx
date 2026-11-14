import Link from 'next/link';
import { t } from '@/i18n/messages';
import { cn } from '@/lib/utils';

export type Section = 'jobs' | 'training';

/**
 * The two main sections, on every page: the job board ("/") and the academy ("/training").
 * The current section comes from the layout (no URL hooks, so pages stay static).
 */
export function MainMenu({ current, className }: { current: Section; className?: string }) {
  const items = [
    { href: '/', label: t.shell.jobs, section: 'jobs' as const },
    { href: '/training', label: t.shell.training, section: 'training' as const },
  ];
  return (
    <nav aria-label={t.shell.mainMenu} className={cn('flex items-center gap-1', className)}>
      {items.map((item) => {
        const active = item.section === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 items-center rounded-none px-4 text-sm font-semibold',
              active
                ? 'bg-ink text-primary-foreground'
                : 'text-ink-soft hover:bg-soft hover:text-ink',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

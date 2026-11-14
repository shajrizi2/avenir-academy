import { JOB_CATEGORY_SLUGS, type JobBoardPage, type JobCategory } from '@ai-academy/shared';
import Link from 'next/link';
import { t } from '@/i18n/messages';
import { cn } from '@/lib/utils';

/** The one control on the board: a row of category buttons with counts (scrolls on phones). */
export function CategoryNav({
  categories,
  totalOpen,
  current,
}: {
  categories: JobBoardPage['categories'];
  totalOpen: number;
  current: JobCategory | null;
}) {
  const items = [
    { href: '/', label: t.jobs.all, count: totalOpen, active: current === null },
    ...categories.map((c) => ({
      href: `/?kategoria=${JOB_CATEGORY_SLUGS[c.category]}`,
      label: t.jobs.categories[c.category],
      count: c.count,
      active: current === c.category,
    })),
  ];
  return (
    <nav aria-label={t.jobs.categoriesLabel} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 pb-1 sm:w-auto sm:flex-wrap">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap',
                item.active
                  ? 'border-ink bg-ink text-primary-foreground'
                  : 'border-line-strong bg-background text-ink hover:border-ink',
              )}
            >
              {item.label}
              <span className={item.active ? 'text-primary-foreground/80' : 'text-ink-soft'}>
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

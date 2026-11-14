import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { t } from '@/i18n/messages';
import { cn } from '@/lib/utils';

/** The Avenir wordmark as a link (to the job board by default). Black, or white on black bands. */
export function Logo({ href = '/', inverse = false }: { href?: string; inverse?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={t.shell.home}
      className={cn('flex items-center rounded-none', inverse ? 'text-background' : 'text-ink')}
    >
      <Wordmark className="h-6 md:h-7" />
    </Link>
  );
}

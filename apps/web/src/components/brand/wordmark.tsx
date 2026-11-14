import { cn } from '@/lib/utils';
import { WORDMARK_PATH } from './wordmark-path';

/**
 * The Avenir wordmark. It takes the text colour (`currentColor`): black on white backgrounds,
 * white on black ones. Never recoloured, stretched or decorated (PLAN D35).
 */
export function Wordmark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 585 184"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('h-7 w-auto', className)}
    >
      <path fill="currentColor" fillRule="evenodd" d={WORDMARK_PATH} />
    </svg>
  );
}

'use client';

import type { Locale } from '@ai-academy/shared';
import { Globe } from 'lucide-react';
import Link from 'next/link';
import { LOCALE_COOKIE } from '@/i18n/cookie';
import { cn } from '@/lib/utils';

interface LanguageSwitchProps {
  target: Locale;
  /** Visible label, written in the target language (e.g. "English" / "Shqip"). */
  label: string;
  /** Accessible name in the current language, e.g. "Language". */
  srLabel: string;
  className?: string;
}

/** Links to the other language and remembers the choice for the "/" redirect. */
export function LanguageSwitch({ target, label, srLabel, className }: LanguageSwitchProps) {
  return (
    <Link
      href={`/${target}`}
      hrefLang={target}
      lang={target}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
      }}
      className={cn(
        'text-ink-soft hover:bg-soft hover:text-ink inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold',
        className,
      )}
    >
      <Globe className="size-4" aria-hidden />
      <span className="sr-only">{srLabel}: </span>
      {label}
    </Link>
  );
}

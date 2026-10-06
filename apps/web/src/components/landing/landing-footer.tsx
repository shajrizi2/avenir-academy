import type { Locale } from '@ai-academy/shared';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import type { LandingMessages } from '@/i18n/messages';
import { LanguageSwitch } from './language-switch';

interface LandingFooterProps {
  locale: Locale;
  t: Pick<LandingMessages, 'footer' | 'nav'>;
}

export function LandingFooter({ locale, t }: LandingFooterProps) {
  const otherLocale: Locale = locale === 'sq' ? 'en' : 'sq';
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo href={`/${locale}`} />
          <p className="text-sm text-slate-600">{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.footer.navLabel} className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <a href="#how-it-works" className="text-slate-600 hover:text-slate-900">
            {t.nav.howItWorks}
          </a>
          <a href="#faq" className="text-slate-600 hover:text-slate-900">
            {t.nav.faq}
          </a>
          <Link href="/courses" className="text-slate-600 hover:text-slate-900">
            {t.footer.courses}
          </Link>
          <Link href="/login" className="text-slate-600 hover:text-slate-900">
            {t.nav.login}
          </Link>
          <Link href="/register" className="text-slate-600 hover:text-slate-900">
            {t.nav.register}
          </Link>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© AI Academy. {t.footer.rights}</p>
          <LanguageSwitch
            target={otherLocale}
            label={t.nav.switchTo}
            srLabel={t.nav.language}
            className="self-start px-0 sm:self-auto sm:px-2.5"
          />
        </div>
      </div>
    </footer>
  );
}

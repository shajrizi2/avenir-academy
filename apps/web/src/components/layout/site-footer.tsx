import Link from 'next/link';
import { CookieSettingsButton } from '@/components/analytics/analytics';
import { Logo } from '@/components/logo';
import { t } from '@/i18n/messages';

const linkClass = 'text-ink-soft hover:text-ink font-medium underline-offset-4 hover:underline';

export function SiteFooter() {
  return (
    <footer className="border-line bg-background border-t">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p className="text-ink-soft">{t.nav.footerTagline}</p>
        </div>
        <nav aria-label={t.nav.footer} className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/courses" className={linkClass}>
            {t.nav.courses}
          </Link>
          <Link href="/register" className={linkClass}>
            {t.nav.createAccount}
          </Link>
          <Link href="/login" className={linkClass}>
            {t.nav.login}
          </Link>
          <CookieSettingsButton label={t.nav.cookieSettings} className={linkClass} />
        </nav>
      </div>
    </footer>
  );
}

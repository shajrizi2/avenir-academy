import Link from 'next/link';
import { CookieSettingsButton } from '@/components/analytics/analytics';
import { Logo } from '@/components/logo';
import { t } from '@/i18n/messages';

const linkClass =
  'text-background/80 hover:text-background font-medium underline-offset-4 hover:underline';

/** The black band at the bottom of every page: white wordmark, the main sections, legal links. */
export function BrandFooter() {
  return (
    <div className="bg-ink text-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10 text-sm sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs space-y-3">
          <Logo inverse />
          <p className="text-background/80 leading-6">{t.shell.tagline}</p>
        </div>
        <nav aria-label={t.shell.footerLinks} className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/" className={linkClass}>
            {t.shell.jobs}
          </Link>
          <Link href="/training" className={linkClass}>
            {t.shell.training}
          </Link>
          <Link href="/for-companies" lang="en" className={linkClass}>
            {t.shell.forCompanies}
          </Link>
          <Link href="/privatesia" className={linkClass}>
            {t.shell.privacy}
          </Link>
          <CookieSettingsButton label={t.nav.cookieSettings} className={linkClass} />
        </nav>
      </div>
      <div className="border-background/15 border-t">
        <p className="text-background/70 mx-auto w-full max-w-[1200px] px-4 py-5 text-xs sm:px-6">
          © Avenir. {t.shell.rights}
        </p>
      </div>
    </div>
  );
}

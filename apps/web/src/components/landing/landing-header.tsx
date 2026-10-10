import type { Locale } from '@ai-academy/shared';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import type { LandingMessages } from '@/i18n/messages';
import { CtaLink } from './cta-link';
import { LanguageSwitch } from './language-switch';
import { MobileMenu } from './mobile-menu';

interface LandingHeaderProps {
  locale: Locale;
  nav: LandingMessages['nav'];
}

export function LandingHeader({ locale, nav }: LandingHeaderProps) {
  const otherLocale: Locale = locale === 'sq' ? 'en' : 'sq';
  const links = [
    { href: '#how-it-works', label: nav.howItWorks },
    { href: '#tracks', label: nav.tracks },
    { href: '#faq', label: nav.faq },
  ];

  return (
    <header className="border-line bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto grid h-16 w-full max-w-[1200px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:h-20 md:grid-cols-[1fr_auto_1fr]">
        <Logo href={`/${locale}`} />
        <nav aria-label={nav.label} className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-ink-soft hover:bg-soft hover:text-ink rounded-full px-4 py-2 text-sm font-semibold"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <LanguageSwitch
            target={otherLocale}
            label={nav.switchTo}
            srLabel={nav.language}
            className="hidden lg:inline-flex"
          />
          <Link
            href="/login"
            className="text-ink hidden rounded-lg px-3 py-2 text-sm font-semibold underline-offset-4 hover:underline md:inline-flex"
          >
            {nav.login}
          </Link>
          <CtaLink href="/register" cta="header_register" locale={locale} variant="chunky">
            {nav.cta}
          </CtaLink>
          <div className="md:hidden">
            <MobileMenu locale={locale} otherLocale={otherLocale} links={links} nav={nav} />
          </div>
        </div>
      </div>
    </header>
  );
}

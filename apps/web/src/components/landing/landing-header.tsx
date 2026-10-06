import type { Locale } from '@ai-academy/shared';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
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
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href={`/${locale}`} />
        <nav aria-label={nav.label} className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitch
            target={otherLocale}
            label={nav.switchTo}
            srLabel={nav.language}
            className="hidden md:inline-flex"
          />
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link href="/login">{nav.login}</Link>
          </Button>
          <CtaLink href="/register" cta="header_register" locale={locale}>
            {nav.register}
          </CtaLink>
          <div className="md:hidden">
            <MobileMenu locale={locale} otherLocale={otherLocale} links={links} nav={nav} />
          </div>
        </div>
      </div>
    </header>
  );
}

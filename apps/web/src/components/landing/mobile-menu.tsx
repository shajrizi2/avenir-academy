'use client';

import type { Locale } from '@ai-academy/shared';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { LandingMessages } from '@/i18n/messages';
import { CtaLink } from './cta-link';
import { LanguageSwitch } from './language-switch';

interface MobileMenuProps {
  locale: Locale;
  otherLocale: Locale;
  links: { href: string; label: string }[];
  nav: LandingMessages['nav'];
}

export function MobileMenu({ locale, otherLocale, links, nav }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label={nav.openMenu}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm gap-0 p-6">
        <SheetHeader className="p-0 pb-6">
          <SheetTitle className="sr-only">{nav.menuTitle}</SheetTitle>
          <Logo href={`/${locale}`} />
        </SheetHeader>
        <nav aria-label={nav.label} className="flex flex-col gap-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-3 border-t pt-6">
          <CtaLink href="/register" cta="menu_register" locale={locale} size="lg" className="h-11">
            {nav.register}
          </CtaLink>
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/login">{nav.login}</Link>
          </Button>
          <LanguageSwitch
            target={otherLocale}
            label={nav.switchTo}
            srLabel={nav.language}
            className="justify-center py-3"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { t } from '@/i18n/messages';
import { MainMenu, type Section } from './main-menu';

/** The main menu behind a hamburger on phones, opening from the right. */
export function SiteMobileMenu({
  current,
  children,
}: {
  current: Section;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label={t.shell.openMenu}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm gap-0 p-6">
        <SheetHeader className="p-0 pb-6">
          <SheetTitle className="sr-only">{t.shell.menuTitle}</SheetTitle>
          <Logo />
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <MainMenu current={current} className="flex-col items-stretch" />
        </div>
        {children && <div className="border-line mt-6 border-t pt-6">{children}</div>}
      </SheetContent>
    </Sheet>
  );
}

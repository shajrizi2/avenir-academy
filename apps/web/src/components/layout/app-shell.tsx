'use client';

import type { Role } from '@ai-academy/shared';
import { Menu } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { t } from '@/i18n/messages';
import { SidebarNav } from './sidebar-nav';
import { UserMenu } from './user-menu';

/** Sidebar layout for dashboard, profile and admin pages. The sidebar becomes a drawer on mobile. */
export function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="border-line bg-background sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r p-4 md:flex">
        <div className="px-3 pt-3">
          <Logo />
        </div>
        <Suspense>
          <SidebarNav role={role} />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line bg-background/90 sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t.nav.openNavigation}>
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetHeader className="p-0 pb-4">
                  <SheetTitle asChild>
                    <div>
                      <Logo />
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <Suspense>
                  <SidebarNav role={role} onNavigate={() => setOpen(false)} />
                </Suspense>
              </SheetContent>
            </Sheet>
            <Logo />
          </div>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-8 px-4 py-8 sm:px-6 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}

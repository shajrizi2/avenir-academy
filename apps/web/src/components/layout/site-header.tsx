import Link from 'next/link';
import { Logo } from '@/components/logo';
import { HeaderAuth } from './header-auth';

export function SiteHeader() {
  return (
    <header className="border-line bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 md:h-20">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden sm:block">
            <Link
              href="/courses"
              className="text-ink-soft hover:bg-soft hover:text-ink rounded-full px-4 py-2 text-sm font-semibold"
            >
              Courses
            </Link>
          </nav>
        </div>
        <HeaderAuth />
      </div>
      <nav aria-label="Main (mobile)" className="border-line border-t px-4 py-2 sm:hidden">
        <Link href="/courses" className="text-ink text-sm font-semibold">
          Browse courses
        </Link>
      </nav>
    </header>
  );
}

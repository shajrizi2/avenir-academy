import Link from 'next/link';
import { Logo } from '@/components/logo';
import { HeaderAuth } from './header-auth';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden sm:block">
            <Link
              href="/courses"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Courses
            </Link>
          </nav>
        </div>
        <HeaderAuth />
      </div>
      <nav aria-label="Main (mobile)" className="border-t px-4 py-2 sm:hidden">
        <Link href="/courses" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Browse courses
        </Link>
      </nav>
    </header>
  );
}

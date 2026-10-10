import Link from 'next/link';
import { CookieSettingsButton } from '@/components/analytics/analytics';
import { Logo } from '@/components/logo';

const linkClass = 'text-ink-soft hover:text-ink font-medium underline-offset-4 hover:underline';

export function SiteFooter() {
  return (
    <footer className="border-line bg-background border-t">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p className="text-ink-soft">Live courses on AI and digital marketing.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/courses" className={linkClass}>
            Courses
          </Link>
          <Link href="/register" className={linkClass}>
            Create account
          </Link>
          <Link href="/login" className={linkClass}>
            Log in
          </Link>
          <CookieSettingsButton label="Cookie settings" className={linkClass} />
        </nav>
      </div>
    </footer>
  );
}

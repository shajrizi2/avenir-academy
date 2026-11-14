import { Logo } from '@/components/logo';
import { HeaderAuth } from './header-auth';
import { MainMenu, type Section } from './main-menu';

/**
 * Header of the public pages: wordmark, the main menu (job board and academy) and, on the
 * right, the sign-in that fits the section (the academy's by default).
 */
export function SiteHeader({
  section = 'training',
  right = <HeaderAuth />,
}: {
  section?: Section;
  right?: React.ReactNode;
}) {
  return (
    <header className="border-line bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 md:h-20">
        <div className="flex items-center gap-6">
          <Logo />
          <MainMenu current={section} className="hidden sm:flex" />
        </div>
        {right}
      </div>
      <MainMenu current={section} className="border-line border-t px-2 py-1 sm:hidden" />
    </header>
  );
}

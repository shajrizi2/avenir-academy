import { Logo } from '@/components/logo';
import { HeaderAuth } from './header-auth';
import { MainMenu, type Section } from './main-menu';
import { SiteMobileMenu } from './site-mobile-menu';

/**
 * Header of the public pages: wordmark on the left, the main menu (job board and academy) and,
 * on the right, the sign-in that fits the section (the academy's by default). On phones the
 * menu and the sign-in sit behind a hamburger on the right.
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
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 md:h-16">
        <div className="flex items-center gap-6">
          <Logo />
          <MainMenu current={section} className="hidden sm:flex" />
        </div>
        {right && <div className="hidden sm:block">{right}</div>}
        <div className="sm:hidden">
          <SiteMobileMenu current={section}>{right}</SiteMobileMenu>
        </div>
      </div>
    </header>
  );
}

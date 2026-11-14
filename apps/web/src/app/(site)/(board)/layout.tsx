import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

/** Pages outside the academy: the job board and the small pages around it. */
export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader section="jobs" right={null} />
      <main id="main" className="bg-background flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

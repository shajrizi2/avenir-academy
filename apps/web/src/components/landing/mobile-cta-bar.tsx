import type { Locale } from '@ai-academy/shared';
import { CtaLink } from './cta-link';

/** Always-visible registration button on phones (hidden from md up). */
export function MobileCtaBar({ locale, label }: { locale: Locale; label: string }) {
  return (
    <div className="border-line bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <CtaLink
        href="/register"
        cta="mobile_bar_register"
        locale={locale}
        variant="chunky"
        size="lg"
        className="w-full"
      >
        {label}
      </CtaLink>
    </div>
  );
}

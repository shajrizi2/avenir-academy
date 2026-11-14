import type { Metadata } from 'next';
import { t } from '@/i18n/messages';

/** Reserved for a later section; empty and kept out of search engines until then. */
export const metadata: Metadata = {
  title: t.sourcing.title,
  robots: { index: false, follow: false },
};

export default function SourcingPage() {
  return (
    <div className="mx-auto min-h-[50vh] w-full max-w-[1200px] px-4 py-16 sm:px-6">
      <h1 className="sr-only">{t.sourcing.title}</h1>
    </div>
  );
}

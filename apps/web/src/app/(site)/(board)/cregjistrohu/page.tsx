import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Unsubscribe } from '@/components/jobs/unsubscribe';
import { t } from '@/i18n/messages';

const copy = t.unsubscribe;

export const metadata: Metadata = {
  title: copy.metaTitle,
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-16 sm:px-6 lg:py-24">
      <header className="space-y-2">
        <h1 className="text-heading tracking-heading text-ink font-extrabold">{copy.title}</h1>
        <p className="text-ink-soft">{copy.lead}</p>
      </header>
      <Suspense>
        <Unsubscribe />
      </Suspense>
    </div>
  );
}

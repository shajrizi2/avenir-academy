import type { Metadata } from 'next';
import { fmt, t } from '@/i18n/messages';

const copy = t.privacy;
/** Bump when the text changes. */
const UPDATED = '14 nëntor 2026';

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: { canonical: '/privatesia' },
};

/** What the job board stores about job seekers, why, for how long, and how to delete it. */
export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-[720px] space-y-10 px-4 py-16 sm:px-6 lg:py-24">
      <header className="space-y-3">
        <h1 className="text-title tracking-heading text-ink font-extrabold">{copy.title}</h1>
        <p className="text-ink-soft">{fmt(copy.updated, { date: UPDATED })}</p>
      </header>
      {copy.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-subheading tracking-heading text-ink font-bold">{section.title}</h2>
          <p className="text-ink text-base leading-7">{section.body}</p>
        </section>
      ))}
    </article>
  );
}

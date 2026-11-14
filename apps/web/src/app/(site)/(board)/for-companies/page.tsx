import type { Metadata } from 'next';
import { Suspense } from 'react';
import { t } from '@/i18n/messages';
import { getSiteSettings } from '@/lib/landing-data';

const copy = t.forCompanies;

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: { canonical: '/for-companies' },
};

/** The one English page (PLAN D35): a placeholder for employers until the offer exists. */
export default function ForCompaniesPage() {
  return (
    <section
      lang="en"
      className="mx-auto w-full max-w-[720px] space-y-6 px-4 py-16 sm:px-6 lg:py-28"
    >
      <h1 className="text-title tracking-heading text-ink font-extrabold">{copy.title}</h1>
      <p className="text-ink-soft text-lg leading-8">{copy.lead}</p>
      <Suspense fallback={<p className="text-ink-soft">{copy.contactSoon}</p>}>
        <Contact />
      </Suspense>
    </section>
  );
}

async function Contact() {
  const settings = await getSiteSettings();
  const email = settings?.contactEmail;
  if (!email) return <p className="text-ink-soft">{copy.contactSoon}</p>;
  const [before, after] = copy.contact.split('{email}');
  return (
    <p className="text-ink text-lg">
      {before}
      <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4">
        {email}
      </a>
      {after}
    </p>
  );
}

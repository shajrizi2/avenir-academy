import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CodeLoginForm } from '@/components/jobs/code-login-form';
import { t } from '@/i18n/messages';

const copy = t.jobs.login;

export const metadata: Metadata = {
  title: copy.metaTitle,
  robots: { index: false, follow: false },
};

export default function JobSeekerLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-16 sm:px-6 lg:py-24">
      <header className="space-y-2">
        <h1 className="text-heading tracking-heading text-ink font-extrabold">{copy.title}</h1>
        <p className="text-ink-soft text-base">{copy.lead}</p>
      </header>
      <Suspense>
        <CodeLoginForm />
      </Suspense>
    </div>
  );
}

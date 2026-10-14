import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/i18n/messages';
import { jakarta } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: t.meta.notFoundTitle,
  robots: { index: false },
};

/** 404 for URLs that match no route (the app has two root layouts, so none can own it). */
export default function GlobalNotFound() {
  return (
    <html lang="sq" className={`${jakarta.variable} h-full antialiased`}>
      <body className="bg-soft flex min-h-full items-center justify-center px-4">
        <main className="max-w-md space-y-4 text-center">
          <p className="text-track-ai-ink text-sm font-bold">{t.errors.notFoundCode}</p>
          <h1 className="text-ink text-heading font-extrabold">{t.errors.notFoundTitle}</h1>
          <p className="text-ink-soft">{t.errors.notFoundText}</p>
          <div className="flex justify-center pt-2">
            <Link href="/sq" className="text-ink font-semibold underline-offset-4 hover:underline">
              {t.errors.goHome}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}

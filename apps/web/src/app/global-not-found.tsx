import type { Metadata } from 'next';
import Link from 'next/link';
import { jakarta } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Page not found · AI Academy',
  robots: { index: false },
};

/** 404 for URLs that match no route (the app has two root layouts, so none can own it). */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="bg-soft flex min-h-full items-center justify-center px-4">
        <main className="max-w-md space-y-4 text-center">
          <p className="text-track-ai-ink text-sm font-bold">404</p>
          <h1 className="text-ink text-heading font-extrabold">Page not found</h1>
          <p className="text-ink-soft">
            Faqja nuk u gjet. The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/sq" className="text-ink font-semibold underline-offset-4 hover:underline">
              Kreu (Shqip)
            </Link>
            <span aria-hidden className="text-line-strong">
              |
            </span>
            <Link href="/en" className="text-ink font-semibold underline-offset-4 hover:underline">
              Home (English)
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}

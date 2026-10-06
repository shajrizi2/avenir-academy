import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'Page not found · AI Academy',
  robots: { index: false },
};

/** 404 for URLs that match no route (the app has two root layouts, so none can own it). */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full items-center justify-center bg-slate-50 px-4">
        <main className="max-w-md space-y-4 text-center">
          <p className="text-primary text-sm font-semibold">404</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Page not found</h1>
          <p className="text-slate-600">
            Faqja nuk u gjet. The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/sq" className="text-primary font-medium hover:underline">
              Kreu (Shqip)
            </Link>
            <span aria-hidden className="text-slate-300">
              |
            </span>
            <Link href="/en" className="text-primary font-medium hover:underline">
              Home (English)
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}

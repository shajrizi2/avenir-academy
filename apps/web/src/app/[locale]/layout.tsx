import { LOCALES } from '@ai-academy/shared';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getLocale } from '@/i18n/server';
import { SITE_URL } from '@/lib/site';
import '../globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };

export const viewport: Viewport = { themeColor: '#4f46e5' };

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/** Root layout of the bilingual marketing site (/sq, /en). */
export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await getLocale();
  return (
    // suppressHydrationWarning: browser extensions often inject attributes on <html>/<body>
    <html
      lang={locale}
      className={`${inter.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

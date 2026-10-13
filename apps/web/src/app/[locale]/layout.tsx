import { ACTIVE_LOCALES } from '@ai-academy/shared';
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@/components/analytics/analytics';
import { getMessages } from '@/i18n/messages';
import { getLocale } from '@/i18n/server';
import { SITE_URL } from '@/lib/site';
import { jakarta } from '../fonts';
import '../globals.css';

export const metadata: Metadata = { metadataBase: new URL(SITE_URL) };

export const viewport: Viewport = { themeColor: '#ffffff' };

export function generateStaticParams() {
  return ACTIVE_LOCALES.map((locale) => ({ locale }));
}

/** Root layout of the marketing site (/sq; /en redirects there). */
export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await getLocale();
  return (
    // suppressHydrationWarning: browser extensions often inject attributes on <html>/<body>
    <html
      lang={locale}
      className={`${jakarta.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="bg-background flex min-h-full flex-col" suppressHydrationWarning>
        {children}
        <Analytics copy={getMessages().landing.consent} />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Analytics, type ConsentCopy } from '@/components/analytics/analytics';
import { Providers } from '@/components/providers';
import { SITE_URL } from '@/lib/site';
import { jakarta } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'AI Academy', template: '%s · AI Academy' },
  description:
    'Live, cohort-based courses on AI and digital marketing. Learn on Google Meet, pass each module, unlock the next.',
};

const CONSENT_COPY: ConsentCopy = {
  label: 'Cookie consent',
  text: 'We use Google Analytics cookies to learn which pages help people find the right course. Nothing is tracked unless you agree.',
  accept: 'Accept analytics',
  decline: 'No thanks',
};

export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: browser extensions often inject attributes on <html>/<body>
    <html lang="en" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="bg-soft flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Analytics copy={CONSENT_COPY} />
      </body>
    </html>
  );
}

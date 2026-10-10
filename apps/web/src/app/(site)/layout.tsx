import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: browser extensions often inject attributes on <html>/<body>
    <html lang="en" className={`${jakarta.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="bg-soft flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

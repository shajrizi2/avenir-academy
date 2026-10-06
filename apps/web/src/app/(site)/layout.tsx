import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { SITE_URL } from '@/lib/site';
import '../globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'AI Academy', template: '%s · AI Academy' },
  description:
    'Live, cohort-based courses on AI and digital marketing. Learn on Google Meet, pass each module, unlock the next.',
};

export const viewport: Viewport = { themeColor: '#4f46e5' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: browser extensions often inject attributes on <html>/<body>
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-slate-50" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

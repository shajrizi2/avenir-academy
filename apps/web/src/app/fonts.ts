import { Plus_Jakarta_Sans } from 'next/font/google';

/** The one typeface: headings 700–800, body 400–500. Shared by both root layouts. */
export const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

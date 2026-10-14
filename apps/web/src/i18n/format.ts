import type { Locale } from '@ai-academy/shared';

/** BCP 47 tags used for Intl formatting per site locale. */
export const INTL_LOCALE: Record<Locale, string> = { sq: 'sq-AL', en: 'en-GB' };

/** Open Graph locale codes. */
export const OG_LOCALE: Record<Locale, string> = { sq: 'sq_AL', en: 'en_GB' };

export { fmt as format } from './messages';

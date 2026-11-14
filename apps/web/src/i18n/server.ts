import { DEFAULT_LOCALE, type Locale } from '@ai-academy/shared';
import { getMessages, type LandingMessages } from './messages';

/** The landing page's locale. The platform is Albanian only (PLAN D29), so this is always `sq`. */
export async function getLocale(): Promise<Locale> {
  return DEFAULT_LOCALE;
}

/** Landing-page copy for the current locale. */
export async function getLandingMessages(): Promise<{ locale: Locale; t: LandingMessages }> {
  const locale = await getLocale();
  return { locale, t: getMessages().landing };
}

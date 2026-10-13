import { isActiveLocale, type Locale } from '@ai-academy/shared';
import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';
import { getMessages, type LandingMessages } from './messages';

/**
 * The current page's locale (from the [locale] root segment). Only Albanian is active:
 * `/en/...` is redirected to `/sq/...` by proxy.ts, anything else is a 404.
 */
export async function getLocale(): Promise<Locale> {
  const value = await rootLocale();
  if (!isActiveLocale(value)) notFound();
  return value;
}

/** Landing-page copy for the current locale. */
export async function getLandingMessages(): Promise<{ locale: Locale; t: LandingMessages }> {
  const locale = await getLocale();
  return { locale, t: getMessages().landing };
}

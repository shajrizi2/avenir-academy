import type { Locale } from '@ai-academy/shared';
import en from '../../messages/en.json';
import sq from '../../messages/sq.json';

/** Albanian is the source of truth; every other locale must have the same shape. */
export type Messages = typeof sq;
export type LandingMessages = Messages['landing'];

const messages: Record<Locale, Messages> = { sq, en: en satisfies Messages };

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

import sq from '../../messages/sq.json';

/**
 * The platform's copy. Albanian is the only active language (every page, email and error
 * is in Albanian); `messages/en.json` stays in the repository for later and is not shipped.
 */
export type Messages = typeof sq;
export type LandingMessages = Messages['landing'];

/** Every user-facing string of the signed-in app and the public pages. */
export const t: Messages = sq;

export function getMessages(): Messages {
  return sq;
}

/** Replaces `{name}` placeholders: fmt('Starts {date}', { date: '…' }). */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** "1 mësim" / "{count} mësime": the singular form for one, the plural template otherwise. */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : fmt(many, { count });
}

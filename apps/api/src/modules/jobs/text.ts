/** Small text helpers shared by the sources and the rules. */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+|#39);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

/** HTML (possibly entity-escaped, as Greenhouse sends it) to plain text. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  const unescaped = /&lt;\w/.test(html) ? decodeEntities(html) : html;
  return decodeEntities(
    unescaped
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Lower case, accents removed, whitespace collapsed: the form every keyword rule matches on. */
export function fold(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

export function asNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.replace(/[^\d.]/g, '')) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** A date from an ISO string, epoch seconds or epoch milliseconds; null when unusable. */
export function asDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  let date: Date;
  if (typeof value === 'number') date = new Date(value < 1e12 ? value * 1000 : value);
  else if (typeof value === 'string' && /^\d+$/.test(value)) return asDate(Number(value));
  else if (typeof value === 'string') date = new Date(value);
  else return null;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Runs `work` over `items` with at most `limit` in flight. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

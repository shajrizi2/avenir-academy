import type { AtsKind } from './types.js';
import { fold } from './text.js';

/** Query parameters that only track where a click came from. */
const TRACKING =
  /^(utm_\w+|ref|refs|source|src|gh_src|lever-source|lever-origin|via|from|campaign)$/i;

/** The same link without tracking parameters, hash or a trailing slash. */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    for (const key of [...u.searchParams.keys()])
      if (TRACKING.test(key)) u.searchParams.delete(key);
    const s = u.toString();
    return s.endsWith('/') && u.pathname !== '/' ? s.slice(0, -1) : s;
  } catch {
    return url.trim();
  }
}

/** A company's board on a career-page system, read from a link to it or to one of its jobs. */
export interface AtsBoard {
  kind: AtsKind;
  token: string;
  /** The job's ID on that system, when the link points at one job. */
  jobId: string | null;
}

/** Reads the career-page system, board and job ID out of a link, if it is one. */
export function atsFromUrl(url: string): AtsBoard | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const token = host.startsWith('boards-api.')
      ? parts[2]
      : parts[0] === 'embed'
        ? u.searchParams.get('for')
        : parts[0];
    const jobsAt = parts.indexOf('jobs');
    const jobId =
      u.searchParams.get('gh_jid') ?? (jobsAt >= 0 ? (parts[jobsAt + 1] ?? null) : null);
    return token ? { kind: 'GREENHOUSE', token: token.toLowerCase(), jobId } : null;
  }
  if (host === 'jobs.lever.co' || host === 'jobs.eu.lever.co') {
    return parts[0]
      ? { kind: 'LEVER', token: parts[0].toLowerCase(), jobId: parts[1] ?? null }
      : null;
  }
  if (host === 'jobs.ashbyhq.com') {
    return parts[0]
      ? { kind: 'ASHBY', token: parts[0].toLowerCase(), jobId: parts[1] ?? null }
      : null;
  }
  if (host === 'apply.workable.com') {
    if (!parts[0] || parts[0] === 'j' || parts[0] === 'api') return null;
    const j = parts.indexOf('j');
    return {
      kind: 'WORKABLE',
      token: parts[0].toLowerCase(),
      jobId: j >= 0 ? (parts[j + 1] ?? null) : null,
    };
  }
  const workable = host.match(/^([a-z0-9-]+)\.workable\.com$/);
  if (workable && workable[1] !== 'apply' && workable[1] !== 'www') {
    const j = parts.indexOf('j');
    return { kind: 'WORKABLE', token: workable[1], jobId: j >= 0 ? (parts[j + 1] ?? null) : null };
  }
  return null;
}

const COMPANY_SUFFIX =
  /\b(inc|incorporated|llc|l\.l\.c|ltd|limited|gmbh|corp|corporation|co|company|s\.?a|s\.?l|b\.?v|ag|oy|ab|sas|srl|pty|plc|sp\.? z o\.?o)\b\.?/g;

/** A company's name reduced to the form two sources agree on: "Acme, Inc." → "acme". */
export function companyKey(name: string): string {
  return (
    fold(name)
      .replace(/&/g, ' and ')
      .replace(COMPANY_SUFFIX, ' ')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || fold(name)
  );
}

const TITLE_WORDS: [RegExp, string][] = [
  [/\bsr\.?(?=\s|$)/g, 'senior'],
  [/\bjr\.?(?=\s|$)/g, 'junior'],
  [/\beng\.?(?=\s|$)/g, 'engineer'],
  [/\bmgr\.?(?=\s|$)/g, 'manager'],
  [/\bdev\.?(?=\s|$)/g, 'developer'],
];

/** A job title without location noise: "Sr. Backend Eng (Remote - EU)" → "senior backend engineer". */
export function cleanTitle(title: string): string {
  let t = fold(title)
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(
      /\((?:[^)]*\b(remote|anywhere|worldwide|europe|emea|us|usa|uk|eu|hybrid|contract|full[- ]?time)\b[^)]*)\)/g,
      ' ',
    )
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s[-–|/,]\s.*\b(remote|anywhere|worldwide|europe|emea|hybrid)\b.*$/, ' ')
    .replace(/\b(100%\s*)?(fully\s+)?remote\b/g, ' ');
  for (const [re, word] of TITLE_WORDS) t = t.replace(re, word);
  return t
    .replace(/[^a-z0-9+#. ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fingerprint(company: string, title: string, region: string): string {
  return `${companyKey(company)}|${cleanTitle(title)}|${region}`;
}

function bigrams(text: string): Map<string, number> {
  const s = ` ${text} `;
  const counts = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const gram = s.slice(i, i + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

/** How alike two cleaned titles are, from 0 to 1 (Dice coefficient on letter pairs). */
export function titleSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const x = bigrams(a);
  const y = bigrams(b);
  let shared = 0;
  for (const [gram, count] of x) shared += Math.min(count, y.get(gram) ?? 0);
  const total = [...x.values(), ...y.values()].reduce((sum, n) => sum + n, 0);
  return (2 * shared) / total;
}

/** Titles this alike, at the same company and region, within 30 days, are one job. */
export const SAME_JOB_SIMILARITY = 0.9;

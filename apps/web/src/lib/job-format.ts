import type { PublicJob } from '@ai-academy/shared';
import { fmt, t } from '@/i18n/messages';

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };

function amount(value: number, currency: string, period: PublicJob['salaryPeriod']): string {
  const symbol = SYMBOLS[currency.toUpperCase()];
  const number = period === 'HOUR' || value < 1000 ? String(value) : `${Math.round(value / 1000)}k`;
  return symbol ? `${symbol}${number}` : `${number} ${currency.toUpperCase()}`;
}

/** "$50k–$70k në vit", "€4k në muaj", "$40 në orë"; null when the company published none. */
export function salaryLabel(
  job: Pick<PublicJob, 'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'>,
): string | null {
  const { salaryMin: min, salaryMax: max, salaryPeriod: period } = job;
  if (!min && !max) return null;
  const currency = job.salaryCurrency ?? 'USD';
  const range =
    min && max && min !== max
      ? `${amount(min, currency, period)}–${amount(max, currency, period)}`
      : amount((max ?? min) as number, currency, period);
  return period ? `${range} ${t.jobs.periods[period]}` : range;
}

/** "sot", "dje", "3 ditë më parë", counted in calendar days in Europe/Tirane. */
export function postedLabel(postedAt: string, now: number): string {
  const day = (ms: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Tirane' }).format(new Date(ms));
  const days = Math.round(
    (Date.parse(day(now)) - Date.parse(day(Date.parse(postedAt)))) / 86_400_000,
  );
  if (days <= 0) return t.jobs.posted.today;
  if (days === 1) return t.jobs.posted.yesterday;
  return fmt(t.jobs.posted.days, { count: days });
}

/** The small grey details after the pay: job type, contract, where applicants may live. */
export function jobDetails(job: PublicJob): string[] {
  const details: string[] = [t.jobs.categories[job.category]];
  if (job.contract !== 'UNKNOWN' && job.region !== 'CONTRACT_ANYWHERE')
    details.push(t.jobs.contracts[job.contract]);
  details.push(t.jobs.regions[job.region]);
  return details;
}

const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'yahoo.co': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'icloud.co': 'icloud.com',
};

/** A likely fix for a mistyped email domain ("emri@gmial.com" → "emri@gmail.com"). */
export function emailTypoFix(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0) return null;
  const fixed = TYPOS[email.slice(at + 1).toLowerCase()];
  return fixed ? `${email.slice(0, at + 1)}${fixed}` : null;
}

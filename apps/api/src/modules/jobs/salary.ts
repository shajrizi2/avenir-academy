import type { Salary } from './types.js';

type Period = NonNullable<Salary['period']>;

/** How sources name the pay period ("annual", "yearly", "hourly", "per month", ...). */
const PERIODS: [RegExp, Period][] = [
  [/^(h|hr|hour|hours|hourly|per hour)$/, 'HOUR'],
  [/^(w|wk|week|weeks|weekly|per week)$/, 'WEEK'],
  [/^(m|mo|month|months|monthly|per month)$/, 'MONTH'],
  [/^(y|yr|year|years|yearly|annual|annually|per year|per annum|pa)$/, 'YEAR'],
];

/** The range a real salary falls in for each period; anything outside is a data error. */
const PLAUSIBLE: Record<Period, [number, number]> = {
  HOUR: [3, 500],
  WEEK: [100, 20_000],
  MONTH: [300, 100_000],
  YEAR: [5_000, 1_500_000],
};

function readPeriod(value: unknown): Period | 'FORTNIGHT' | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (/^(fortnight|fortnightly|biweekly|bi-weekly)$/.test(v)) return 'FORTNIGHT';
  return PERIODS.find(([re]) => re.test(v))?.[1] ?? null;
}

/** A pay figure from a feed: a positive number, or null for 0, blanks and junk. */
function money(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** When a source gives no period, the size of the number tells it (or nothing is shown). */
function guessPeriod(top: number): Period | null {
  if (top <= PLAUSIBLE.HOUR[1]) return 'HOUR';
  if (top >= 15_000) return 'YEAR';
  return null;
}

/**
 * The pay a source published, in one shape, or null when it is missing or impossible.
 * `period` is the source's own label; when it is missing the amount decides (40 → per hour,
 * 60,000 → per year), and an amount that fits no period is dropped rather than shown wrong.
 */
export function normalizeSalary(input: {
  min: unknown;
  max: unknown;
  currency: unknown;
  period: unknown;
}): Salary | null {
  let min = money(input.min);
  let max = money(input.max);
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  let period = readPeriod(input.period);
  if (period === 'FORTNIGHT') {
    // Shown per month: 26 fortnights a year.
    const toMonth = (n: number | null) => (n === null ? null : Math.round((n * 26) / 12));
    min = toMonth(min);
    max = toMonth(max);
    period = 'MONTH';
  }
  const top = (max ?? min) as number;
  const resolved = period ?? guessPeriod(top);
  if (!resolved) return null;
  const [low, high] = PLAUSIBLE[resolved];
  if (top < low || top > high || (min !== null && min < low / 2)) return null;

  const currency =
    typeof input.currency === 'string' && /^[a-z]{3}$/i.test(input.currency.trim())
      ? input.currency.trim().toUpperCase()
      : 'USD';
  return { min, max, currency, period: resolved };
}

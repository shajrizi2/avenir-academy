const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ', ALL: 'L ' };

/** "€89" or "€89,50" from minor units. Decimal comma, as written in Albanian. */
export function formatPrice(cents: number, currency: string): string {
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  const whole = Math.trunc(cents / 100);
  const minor = Math.abs(cents % 100);
  const amount = minor === 0 ? String(whole) : `${whole},${String(minor).padStart(2, '0')}`;
  return `${symbol}${amount}`;
}

/** Whole-number discount of a price against a list price (0 when there is none). */
export function discountPercent(priceCents: number, listPriceCents: number | null): number {
  if (!listPriceCents || listPriceCents <= priceCents) return 0;
  return Math.round((1 - priceCents / listPriceCents) * 100);
}

import { describe, expect, it } from 'vitest';
import { legacyRedirects } from './legacy-redirects';

describe('legacyRedirects', () => {
  const rules = legacyRedirects();
  const target = (source: string) => rules.find((r) => r.source === source)?.destination;

  it('moves the old landing pages to /training', () => {
    expect(target('/sq')).toBe('/training');
    expect(target('/en/:path*')).toBe('/training');
  });

  it('moves every old academy address, deep links included', () => {
    expect(target('/login')).toBe('/training/login');
    expect(target('/checkout/:path*')).toBe('/training/checkout/:path*');
    expect(target('/payments/:path*')).toBe('/training/payments/:path*');
    expect(target('/learn/:path*')).toBe('/training/learn/:path*');
  });

  it('is permanent and never points back at itself', () => {
    for (const rule of rules) {
      expect(rule.permanent).toBe(true);
      expect(rule.destination.startsWith('/training')).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeSalary } from './salary.js';

describe('normalizeSalary', () => {
  it('keeps the period a feed gives', () => {
    expect(normalizeSalary({ min: 6, max: 7, currency: 'USD', period: 'hourly' })).toEqual({
      min: 6,
      max: 7,
      currency: 'USD',
      period: 'HOUR',
    });
    expect(normalizeSalary({ min: 3000, max: 4000, currency: 'eur', period: 'monthly' })).toEqual({
      min: 3000,
      max: 4000,
      currency: 'EUR',
      period: 'MONTH',
    });
    expect(
      normalizeSalary({ min: 90000, max: 120000, currency: 'USD', period: 'annual' })?.period,
    ).toBe('YEAR');
  });

  it('never shows an hourly rate as a yearly salary ($6–$7 a year)', () => {
    expect(normalizeSalary({ min: 6, max: 7, currency: 'USD', period: 'annual' })).toBeNull();
    expect(normalizeSalary({ min: 6, max: 7, currency: 'USD', period: null })?.period).toBe('HOUR');
  });

  it('guesses only when the amount is unmistakable', () => {
    expect(normalizeSalary({ min: 60000, max: 80000, currency: null, period: null })).toEqual({
      min: 60000,
      max: 80000,
      currency: 'USD',
      period: 'YEAR',
    });
    expect(normalizeSalary({ min: 2000, max: 3000, currency: 'USD', period: null })).toBeNull();
  });

  it('turns fortnightly pay into monthly and swaps a reversed range', () => {
    expect(
      normalizeSalary({ min: 2000, max: 1500, currency: 'AUD', period: 'fortnightly' }),
    ).toEqual({
      min: 3250,
      max: 4333,
      currency: 'AUD',
      period: 'MONTH',
    });
  });

  it('drops zeros, blanks and absurd numbers', () => {
    expect(normalizeSalary({ min: 0, max: 0, currency: 'USD', period: 'annual' })).toBeNull();
    expect(normalizeSalary({ min: '', max: null, currency: 'USD', period: 'annual' })).toBeNull();
    expect(
      normalizeSalary({ min: 1, max: 99_000_000, currency: 'USD', period: 'annual' }),
    ).toBeNull();
  });
});

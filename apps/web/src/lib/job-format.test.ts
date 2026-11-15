import type { PublicJob } from '@ai-academy/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/i18n/messages';
import { emailTypoFix, jobDetails, postedLabel, salaryLabel } from './job-format';

const job = (over: Partial<PublicJob> = {}): PublicJob => ({
  id: '1',
  title: 'Growth Marketer',
  company: 'Acme',
  category: 'MARKETING',
  contract: 'EMPLOYEE',
  region: 'EUROPE',
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryPeriod: null,
  applyUrl: 'https://example.com',
  postedAt: '2026-11-14T08:00:00Z',
  summary: null,
  open: true,
  ...over,
});

describe('job format', () => {
  it('writes salaries short', () => {
    expect(
      salaryLabel(
        job({ salaryMin: 50000, salaryMax: 70000, salaryCurrency: 'USD', salaryPeriod: 'YEAR' }),
      ),
    ).toBe('$50k–$70k në vit');
    expect(
      salaryLabel(job({ salaryMax: 4000, salaryCurrency: 'EUR', salaryPeriod: 'MONTH' })),
    ).toBe('€4k në muaj');
    expect(
      salaryLabel(
        job({ salaryMin: 40, salaryMax: 40, salaryCurrency: 'USD', salaryPeriod: 'HOUR' }),
      ),
    ).toBe('$40 në orë');
    expect(
      salaryLabel(job({ salaryMin: 30000, salaryCurrency: 'CHF', salaryPeriod: 'YEAR' })),
    ).toBe('30k CHF në vit');
    expect(salaryLabel(job())).toBeNull();
  });

  it('says when a job was posted in Kosovo calendar days', () => {
    const now = Date.parse('2026-11-14T10:00:00Z');
    expect(postedLabel('2026-11-14T00:30:00Z', now)).toBe('sot');
    expect(postedLabel('2026-11-13T12:00:00Z', now)).toBe('dje');
    expect(postedLabel('2026-11-10T12:00:00Z', now)).toBe('4 ditë më parë');
  });

  it('lists the job type, the contract once, and where applicants may live', () => {
    expect(jobDetails(job({ contract: 'EMPLOYEE', region: 'EUROPE' }))).toEqual([
      t.jobs.categories.MARKETING,
      'Punësim',
      'Evropë',
    ]);
    expect(jobDetails(job({ contract: 'CONTRACTOR', region: 'CONTRACT_ANYWHERE' }))).toEqual([
      t.jobs.categories.MARKETING,
      'Kontratë nga kudo',
    ]);
  });

  it('writes weekly and hourly pay with their period', () => {
    expect(
      salaryLabel({ salaryMin: 30, salaryMax: 45, salaryCurrency: 'EUR', salaryPeriod: 'HOUR' }),
    ).toBe('€30–€45 në orë');
    expect(
      salaryLabel({ salaryMin: null, salaryMax: 900, salaryCurrency: 'USD', salaryPeriod: 'WEEK' }),
    ).toBe('$900 në javë');
  });

  it('suggests a fix for common email typos', () => {
    expect(emailTypoFix('ana@gmial.com')).toBe('ana@gmail.com');
    expect(emailTypoFix('ana@gmail.com')).toBeNull();
  });
});

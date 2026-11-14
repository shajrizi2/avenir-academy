import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate.js';
import { categorize } from './rules/category.js';
import { checkEligibility } from './rules/eligibility.js';
import { checkRemote } from './rules/remote.js';
import { scamScore } from './rules/scam.js';
import type { RawPosting } from './types.js';

function posting(over: Partial<RawPosting> = {}): RawPosting {
  return {
    source: 'GREENHOUSE',
    externalId: '1',
    sourceUrl: 'https://boards.greenhouse.io/acme/jobs/1',
    applyUrl: 'https://boards.greenhouse.io/acme/jobs/1',
    title: 'Senior Backend Engineer',
    company: 'Acme',
    locationText: 'Remote - Worldwide',
    regions: [],
    remote: null,
    workplace: null,
    employmentType: 'Full-time',
    description: 'We build tools for teams. You will own our APIs.',
    sourceCategories: [],
    postedAt: new Date('2026-11-10T00:00:00Z'),
    salary: null,
    ...over,
  };
}

describe('remote rule', () => {
  it('accepts remote locations, flags and remote-only boards', () => {
    expect(checkRemote(posting()).remote).toBe(true);
    expect(checkRemote(posting({ locationText: 'Berlin', remote: true })).remote).toBe(true);
    expect(checkRemote(posting({ source: 'REMOTEOK', locationText: '' })).remote).toBe(true);
  });

  it('rejects hybrid, on-site and relocation jobs', () => {
    expect(checkRemote(posting({ workplace: 'hybrid' })).rule).toBe('not_remote:hybrid');
    expect(checkRemote(posting({ locationText: 'London (Hybrid)' })).remote).toBe(false);
    expect(checkRemote(posting({ title: 'Engineer, On-site' })).remote).toBe(false);
    expect(
      checkRemote(
        posting({ description: 'This is a hybrid role with 3 days a week in the office.' }),
      ).remote,
    ).toBe(false);
    expect(checkRemote(posting({ description: 'Relocation is required.' })).remote).toBe(false);
    expect(checkRemote(posting({ locationText: 'New York, NY' })).rule).toBe(
      'not_remote:no_signal',
    );
  });
});

describe('Kosovo eligibility rule', () => {
  it('accepts worldwide, Europe and Balkans jobs', () => {
    expect(checkEligibility(posting()).region).toBe('WORLDWIDE');
    expect(checkEligibility(posting({ locationText: 'Remote (Anywhere)' })).region).toBe(
      'WORLDWIDE',
    );
    expect(checkEligibility(posting({ locationText: 'Remote - Europe' })).region).toBe('EUROPE');
    expect(checkEligibility(posting({ locationText: 'Remote, EMEA' })).region).toBe('EUROPE');
    expect(checkEligibility(posting({ locationText: 'Remote (CET ±3h)' })).region).toBe('EUROPE');
    expect(checkEligibility(posting({ locationText: 'Remote - Kosovo' })).region).toBe('BALKANS');
    expect(
      checkEligibility(posting({ source: 'HIMALAYAS', locationText: '', regions: [] })).region,
    ).toBe('WORLDWIDE');
  });

  it('accepts US and UK jobs when they are contractor jobs', () => {
    const us = checkEligibility(
      posting({ locationText: 'Remote - US', employmentType: 'Contract' }),
    );
    expect(us).toMatchObject({
      eligible: true,
      region: 'CONTRACT_ANYWHERE',
      contract: 'CONTRACTOR',
    });
    const uk = checkEligibility(
      posting({
        locationText: 'Remote (UK)',
        description: 'This is an independent contractor role.',
      }),
    );
    expect(uk.region).toBe('CONTRACT_ANYWHERE');
  });

  it('accepts jobs that hire through an employer of record when the location is open', () => {
    expect(
      checkEligibility(
        posting({ locationText: 'Remote', description: 'We hire through Deel in 100+ countries.' }),
      ).region,
    ).toBe('GLOBAL_EMPLOYER');
  });

  it('rejects plain US-only, UK-only and EU-only employee jobs', () => {
    expect(checkEligibility(posting({ locationText: 'Remote - US' })).rule).toBe(
      'not_eligible:location',
    );
    expect(checkEligibility(posting({ locationText: 'Remote - United Kingdom' })).eligible).toBe(
      false,
    );
    expect(checkEligibility(posting({ locationText: 'Remote (EU)' })).rule).toBe(
      'not_eligible:eu_only',
    );
    expect(checkEligibility(posting({ locationText: 'Remote' })).eligible).toBe(false);
  });

  it('rejects hard requirements even for contractor jobs', () => {
    const contract = { employmentType: 'Contract', locationText: 'Remote - US' };
    for (const description of [
      'Applicants must be US citizens.',
      'Green card holders welcome.',
      'An active TS/SCI clearance is required.',
      'This is a W-2 position.',
      'Paid as a 1099 contractor.',
      'You must be authorized to work in the United States.',
      'You must have the right to work in the UK.',
      'Candidates must reside in Canada.',
    ]) {
      expect(checkEligibility(posting({ ...contract, description })).eligible, description).toBe(
        false,
      );
    }
  });

  it('allows a residence requirement that includes Kosovo', () => {
    expect(
      checkEligibility(
        posting({ locationText: 'Remote - Europe', description: 'You must be based in Europe.' }),
      ).eligible,
    ).toBe(true);
  });

  it('uses the description for "anywhere" only when the location says nothing', () => {
    const text = 'We hire from anywhere in the world.';
    expect(checkEligibility(posting({ locationText: 'Remote', description: text })).region).toBe(
      'WORLDWIDE',
    );
    expect(
      checkEligibility(posting({ locationText: 'Remote - US', description: text })).eligible,
    ).toBe(false);
  });
});

describe('scam score', () => {
  it('starts career-page jobs at 0 and board jobs at 1', () => {
    expect(scamScore({ posting: posting(), category: 'ENGINEERING', blocked: false }).score).toBe(
      0,
    );
    expect(
      scamScore({
        posting: posting({ source: 'REMOTEOK', applyUrl: 'https://remoteok.com/remote-jobs/1' }),
        category: 'ENGINEERING',
        blocked: false,
      }).score,
    ).toBe(1);
  });

  it('adds points for fees, chat-app contact, odd payments and free-mail contacts', () => {
    const p = posting({
      source: 'JOBICY',
      applyUrl: 'https://jobicy.com/jobs/1',
      description:
        'A small registration fee applies. Contact us on Telegram. Paid in USDT. Write to hr.jobs@gmail.com',
    });
    const result = scamScore({ posting: p, category: 'OTHER', blocked: false });
    expect(result.reasons).toEqual(
      expect.arrayContaining(['fee', 'chat_app_contact', 'odd_payment', 'free_mail_contact']),
    );
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('rejects shortened or form apply links and absurd pay', () => {
    expect(
      scamScore({
        posting: posting({ applyUrl: 'https://forms.gle/abc' }),
        category: 'OTHER',
        blocked: false,
      }).score,
    ).toBeGreaterThanOrEqual(3);
    const pay = posting({
      title: 'Data Entry Clerk',
      salary: { min: 90000, max: 120000, currency: 'USD', period: 'YEAR' },
    });
    expect(
      scamScore({ posting: pay, category: 'FINANCE_ADMIN', blocked: false }).reasons,
    ).toContain('salary_too_high');
  });

  it('blocks companies and domains on the blocklist', () => {
    expect(scamScore({ posting: posting(), category: 'OTHER', blocked: true }).score).toBe(99);
  });
});

describe('categories', () => {
  it.each([
    ['Senior Performance Marketer', 'MARKETING'],
    ['SEO Specialist', 'MARKETING'],
    ['Sales Engineer', 'SALES'],
    ['Customer Support Engineer', 'SUPPORT'],
    ['Product Designer', 'DESIGN'],
    ['Machine Learning Engineer', 'AI_DATA'],
    ['Data Analyst', 'AI_DATA'],
    ['Senior Backend Engineer', 'ENGINEERING'],
    ['Product Manager, Payments', 'PRODUCT'],
    ['Technical Writer', 'WRITING'],
    ['Technical Recruiter', 'HR'],
    ['Accountant', 'FINANCE_ADMIN'],
    ['Chief Happiness Officer', 'OTHER'],
  ])('%s → %s', (title, category) => {
    expect(categorize(title)).toBe(category);
  });

  it('falls back to the source category', () => {
    expect(categorize('Specialist', ['Marketing'])).toBe('MARKETING');
  });
});

describe('evaluate', () => {
  it('publishes a clean, remote, eligible job with its region and category', () => {
    expect(evaluate(posting(), { blocked: false })).toMatchObject({
      publish: true,
      rule: 'eligible:worldwide',
      region: 'WORLDWIDE',
      category: 'ENGINEERING',
    });
  });

  it('names the first rule that failed', () => {
    expect(evaluate(posting({ workplace: 'onsite' }), { blocked: false }).rule).toBe(
      'not_remote:onsite',
    );
    expect(evaluate(posting({ locationText: 'Remote - US' }), { blocked: false }).rule).toBe(
      'not_eligible:location',
    );
    expect(evaluate(posting({ applyUrl: 'https://bit.ly/x' }), { blocked: false }).rule).toBe(
      'scam',
    );
  });
});

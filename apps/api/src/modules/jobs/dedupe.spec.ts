import { describe, expect, it } from 'vitest';
import {
  atsFromUrl,
  cleanTitle,
  cleanUrl,
  companyKey,
  fingerprint,
  titleSimilarity,
} from './dedupe.js';

describe('duplicates', () => {
  it('cleans tracking parameters from links', () => {
    expect(
      cleanUrl('https://Jobs.Lever.co/acme/123/?utm_source=x&lever-source=remoteok#apply'),
    ).toBe('https://jobs.lever.co/acme/123');
    expect(cleanUrl('https://acme.com/jobs?id=7&ref=board')).toBe('https://acme.com/jobs?id=7');
  });

  it('reads the career-page system, board and job ID from links', () => {
    expect(atsFromUrl('https://boards.greenhouse.io/acme/jobs/4821?gh_src=x')).toEqual({
      kind: 'GREENHOUSE',
      token: 'acme',
      jobId: '4821',
    });
    expect(atsFromUrl('https://job-boards.greenhouse.io/acme/jobs/9')?.jobId).toBe('9');
    expect(atsFromUrl('https://jobs.lever.co/acme/7f1e-uuid/apply')).toEqual({
      kind: 'LEVER',
      token: 'acme',
      jobId: '7f1e-uuid',
    });
    expect(atsFromUrl('https://jobs.ashbyhq.com/acme/abc-123')?.kind).toBe('ASHBY');
    expect(atsFromUrl('https://apply.workable.com/acme/j/AB12CD/')).toEqual({
      kind: 'WORKABLE',
      token: 'acme',
      jobId: 'AB12CD',
    });
    expect(atsFromUrl('https://acme.workable.com/j/AB12CD')?.token).toBe('acme');
    expect(atsFromUrl('https://acme.com/careers/1')).toBeNull();
  });

  it('reduces company names and titles to the form two sources agree on', () => {
    expect(companyKey('Acme, Inc.')).toBe('acme');
    expect(companyKey('Acme Labs GmbH')).toBe('acme labs');
    expect(cleanTitle('Sr. Backend Eng (Remote - EU)')).toBe('senior backend engineer');
    expect(cleanTitle('Growth Marketer - 100% Remote')).toBe('growth marketer');
    expect(fingerprint('Acme Inc', 'Sr. Designer (Remote)', 'EUROPE')).toBe(
      'acme|senior designer|EUROPE',
    );
  });

  it('treats nearly identical titles as the same job', () => {
    expect(titleSimilarity('senior product designer', 'senior product designer')).toBe(1);
    expect(titleSimilarity('senior product designer', 'senior product designers')).toBeGreaterThan(
      0.9,
    );
    expect(titleSimilarity('growth marketer', 'growth marketing manager')).toBeLessThan(0.9);
  });
});

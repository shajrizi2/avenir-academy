import { categorize } from './rules/category.js';
import { checkEligibility } from './rules/eligibility.js';
import { checkRemote } from './rules/remote.js';
import { SCAM_LIMIT, scamScore } from './rules/scam.js';
import type { Decision, RawPosting } from './types.js';

export interface EvaluateContext {
  companyWebsite?: string | null;
  blocked: boolean;
}

/** Runs every rule on a posting: remote, Kosovo eligibility, scam score, category. */
export function evaluate(posting: RawPosting, ctx: EvaluateContext): Decision {
  const category = categorize(posting.title, posting.sourceCategories);
  const scam = scamScore({
    posting,
    category,
    companyWebsite: ctx.companyWebsite,
    blocked: ctx.blocked,
  });
  const base = { category, scamScore: scam.score, scamReasons: scam.reasons };

  const remote = checkRemote(posting);
  if (!remote.remote)
    return { ...base, publish: false, rule: remote.rule, region: null, contract: 'UNKNOWN' };

  const eligibility = checkEligibility(posting);
  if (!eligibility.eligible) {
    return {
      ...base,
      publish: false,
      rule: eligibility.rule,
      region: null,
      contract: eligibility.contract,
    };
  }
  if (scam.score >= SCAM_LIMIT) {
    return {
      ...base,
      publish: false,
      rule: 'scam',
      region: eligibility.region,
      contract: eligibility.contract,
    };
  }
  return {
    ...base,
    publish: true,
    rule: eligibility.rule,
    region: eligibility.region,
    contract: eligibility.contract,
  };
}

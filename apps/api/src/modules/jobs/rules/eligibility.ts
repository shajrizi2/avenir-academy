import type { JobContract, JobRegion } from '../../../generated/prisma/enums.js';
import type { RawPosting } from '../types.js';
import { fold } from '../text.js';

/**
 * Can someone living in Kosovo apply? (PLAN D36.) A job is eligible when it is open worldwide,
 * to Europe or the Balkans, or when it is a contractor job (in any country, the US and UK
 * included), or when it hires through a global employer-of-record platform. Postings that
 * require living in a country, citizenship, a clearance, US tax forms or a work permit are
 * never eligible. Anything unclear is left out.
 */

// ---- Hard blockers: the posting itself rules out an applicant in Kosovo. ----
const BLOCKERS: [string, RegExp][] = [
  [
    'citizenship',
    /\b(us|u\.s\.|american|uk|british|eu) citizens?(hip)?( only| is required| required)\b|\b(must|should) be (an? )?(us|u\.s\.|american|uk|british|eu) (citizens?|nationals?)\b|\bcitizenship (is )?required\b/,
  ],
  ['green_card', /\bgreen card\b/],
  [
    'clearance',
    /\b(security clearance|clearance (is )?required|(active|current) (secret|top secret|ts\/sci)|ts\/sci)\b/,
  ],
  ['us_tax_form', /\bw-?2\b|\b1099\b/],
  ['ssn', /\b(ssn|social security number)\b/],
  [
    'work_authorization',
    /\b(must|need to|required to|should) (already )?(be|have) (legally )?(authori[sz]ed|eligible|permitted|the right) to work (in|within|from) (the )?(us|u\.s\.|usa|united states|uk|united kingdom|eu|european union|canada|australia|germany|france|spain|netherlands|ireland|poland|india|brazil|mexico)\b|\b(work authori[sz]ation|right to work) (in|for) (the )?(us|u\.s\.|usa|united states|uk|united kingdom|eu|european union|canada|australia)\b|\bno (visa )?sponsorship\b.{0,60}\b(us|u\.s\.|united states|uk)\b/,
  ],
];

/** "must be based in X": blocks unless X is open to Kosovo. */
const RESIDENCE =
  /\b(must|should|need to|required to|have to) (currently )?(reside|live|be (located|based|resident)) (in|within) ([^.;\n]{0,60})/;

// ---- Where applicants may be. ----
const OPEN_WORLD =
  /\b(worldwide|world wide|anywhere|global(ly)?|any (location|country|timezone|time zone)|international)\b/;
const OPEN_WORLD_IN_TEXT =
  /\b((work|hire|hiring|recruit) (from )?(anywhere|worldwide|globally)|anywhere in the world|candidates (from )?(anywhere|worldwide|all over the world)|open to (candidates|applicants|people) (from )?(anywhere|worldwide|all countries)|location: (worldwide|anywhere))\b/;
const EUROPE =
  /\b(europe|european time ?zones?|emea|cet|cest|central european|gmt\+1|utc\+1|gmt ?\+ ?[0-2]|utc ?\+ ?[0-2])\b/;
const EU_ONLY = /\b(eu|european union|eea)\b/;
const BALKANS = /\b(kosovo|kosova|balkans?|western balkans|south[- ]?east(ern)? europe)\b/;

// ---- How they are hired. ----
const CONTRACT_TYPE =
  /\b(contract(or)?|freelance(r)?|b2b|self[- ]employed|independent|temporary|consult(ant|ing))\b/;
const CONTRACT_TEXT =
  /\b(independent contractor|as an? (contractor|freelancer|consultant)|(on )?an? (freelance|contract|contractor|consulting|b2b) (basis|agreement|contract|role|position)|b2b contract|contractor (role|position|agreement)|freelance (role|position))\b/;
const GLOBAL_EMPLOYER =
  /\b(deel|remote\.com|oyster( hr)?|multiplier|rippling eor|papaya global|velocity global|globalization partners|g-p\.com|employer of record|\beor\b)\b/;

export interface EligibilityResult {
  eligible: boolean;
  rule: string;
  region: JobRegion | null;
  contract: JobContract;
}

function residenceIsOpen(place: string): boolean {
  return OPEN_WORLD.test(place) || EUROPE.test(place) || BALKANS.test(place);
}

export function checkEligibility(p: RawPosting): EligibilityResult {
  const description = fold(p.description);
  const where = fold([p.locationText, ...p.regions].join(' | '));
  const everything = `${fold(p.title)} | ${where} | ${description}`;

  const contract: JobContract =
    CONTRACT_TYPE.test(fold(p.employmentType)) || CONTRACT_TEXT.test(everything)
      ? 'CONTRACTOR'
      : p.employmentType
        ? 'EMPLOYEE'
        : 'UNKNOWN';

  for (const [name, re] of BLOCKERS) {
    if (re.test(everything))
      return { eligible: false, rule: `not_eligible:${name}`, region: null, contract };
  }
  const residence = everything.match(RESIDENCE);
  if (residence && !residenceIsOpen(residence[6])) {
    return { eligible: false, rule: 'not_eligible:residence', region: null, contract };
  }

  // A board that lists no restriction (Himalayas, Jobicy's "Anywhere") means worldwide.
  const boardSaysOpen =
    (p.source === 'HIMALAYAS' && p.regions.length === 0) ||
    (p.source === 'REMOTEOK' &&
      where.replace(/[|\s]/g, '') === '' &&
      OPEN_WORLD_IN_TEXT.test(description));
  const locationIsBare = /^(remote|fully remote|100% remote|)$/.test(
    where.replace(/[|]/g, ' ').trim(),
  );

  if (BALKANS.test(where))
    return { eligible: true, rule: 'eligible:balkans', region: 'BALKANS', contract };
  if (OPEN_WORLD.test(where) || boardSaysOpen) {
    return { eligible: true, rule: 'eligible:worldwide', region: 'WORLDWIDE', contract };
  }
  if (EUROPE.test(where))
    return { eligible: true, rule: 'eligible:europe', region: 'EUROPE', contract };
  if (locationIsBare && OPEN_WORLD_IN_TEXT.test(description)) {
    return { eligible: true, rule: 'eligible:worldwide_text', region: 'WORLDWIDE', contract };
  }
  if (contract === 'CONTRACTOR') {
    return { eligible: true, rule: 'eligible:contractor', region: 'CONTRACT_ANYWHERE', contract };
  }
  if (GLOBAL_EMPLOYER.test(everything) && (locationIsBare || EU_ONLY.test(where))) {
    return {
      eligible: true,
      rule: 'eligible:global_employer',
      region: 'GLOBAL_EMPLOYER',
      contract,
    };
  }
  if (EU_ONLY.test(where))
    return { eligible: false, rule: 'not_eligible:eu_only', region: null, contract };
  return { eligible: false, rule: 'not_eligible:location', region: null, contract };
}

import type { JobContract, JobRegion } from '../../../generated/prisma/enums.js';
import type { RawPosting } from '../types.js';
import { fold } from '../text.js';
import { requiredLanguage } from './language.js';

/**
 * Can someone living in Kosovo apply? (PLAN D36, D38.) A job is eligible when it is open
 * worldwide, to Europe or the Balkans; when a company's own page offers it as a contractor job
 * (even "Remote - US"); or when it names no place and hires through a global employer of record.
 * A list of countries from a job board (Himalayas, Jobicy) is where applicants must live, so a
 * list without Kosovo or a region that includes it is never eligible, contractor or not. So are
 * postings that require living in a country, a time zone far from Kosovo, citizenship, a
 * clearance, US tax forms or a work permit. Anything unclear is left out.
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

/** "must be based in X", "only candidates in X", "X-based applicants only": block unless X includes Kosovo. */
const RESIDENCE: RegExp[] = [
  /\b(must|should|need to|required to|have to) (currently )?(reside|live|be (located|based|resident)) (in|within) (?<place>[^.;\n]{0,60})/,
  /\b(only|exclusively) (open to |accepting |hiring |considering )?(candidates|applicants|residents|people|talent)( who are| currently)? (based |located |living |residing )?(in|from) (?<place>[^.;\n]{0,60})/,
  /\b(open|available) (only )?to (candidates|applicants|residents|people) (based |located |living |residing )?(in|from) (?<place>[^.;\n]{0,40}?) only\b/,
  /\b(?<place>[a-z. ]{2,30})[- ](based|located|resident) (candidates|applicants|talent) only\b/,
];

/** Kosovo is UTC+1 (UTC+2 in summer): a job must accept one of these offsets. */
const KOSOVO_OFFSETS: [number, number] = [-1, 3];

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

const ALL_PLACES = /\ball (countries|locations|regions|time ?zones)\b/;

function residenceIsOpen(place: string): boolean {
  return (
    OPEN_WORLD.test(place) || ALL_PLACES.test(place) || EUROPE.test(place) || BALKANS.test(place)
  );
}

/** The region a board's country list opens to someone in Kosovo, or null when it doesn't. */
function openRegion(regions: string[]): JobRegion | null {
  const list = fold(regions.join(' | '));
  if (BALKANS.test(list)) return 'BALKANS';
  if (OPEN_WORLD.test(list)) return 'WORLDWIDE';
  if (EUROPE.test(list)) return 'EUROPE';
  return null;
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
  const language = requiredLanguage(p.title, p.description);
  if (language)
    return { eligible: false, rule: `not_eligible:language:${language}`, region: null, contract };
  for (const re of RESIDENCE) {
    const place = everything.match(re)?.groups?.place;
    if (place !== undefined && !residenceIsOpen(place))
      return { eligible: false, rule: 'not_eligible:residence', region: null, contract };
  }
  const zones = p.timezones ?? [];
  if (zones.length > 0 && !zones.some((z) => z >= KOSOVO_OFFSETS[0] && z <= KOSOVO_OFFSETS[1])) {
    return { eligible: false, rule: 'not_eligible:timezone', region: null, contract };
  }

  // A job board's list of countries is a hard restriction: being a contractor doesn't help.
  if (p.regions.length > 0) {
    const region = openRegion(p.regions);
    if (region)
      return { eligible: true, rule: `eligible:${region.toLowerCase()}`, region, contract };
    return { eligible: false, rule: 'not_eligible:countries', region: null, contract };
  }

  // A board that lists no restriction (Himalayas, Jobicy's "Anywhere") means worldwide.
  const boardSaysOpen =
    p.source === 'HIMALAYAS' ||
    (p.source === 'REMOTEOK' &&
      where.replace(/[|\s]/g, '') === '' &&
      OPEN_WORLD_IN_TEXT.test(description));
  const locationIsBare = /^(remote|fully remote|100% remote|remote only|)$/.test(
    where
      .replace(/[|,()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
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
  // A company's own page saying "Remote - US" for a contractor job: contractors can work from
  // anywhere (the product owner's rule, PLAN D36). Board country lists never get here.
  if (contract === 'CONTRACTOR') {
    return { eligible: true, rule: 'eligible:contractor', region: 'CONTRACT_ANYWHERE', contract };
  }
  if (!locationIsBare) {
    const rule = EU_ONLY.test(where) ? 'not_eligible:eu_only' : 'not_eligible:location';
    return { eligible: false, rule, region: null, contract };
  }
  if (GLOBAL_EMPLOYER.test(everything)) {
    return {
      eligible: true,
      rule: 'eligible:global_employer',
      region: 'GLOBAL_EMPLOYER',
      contract,
    };
  }
  return { eligible: false, rule: 'not_eligible:location', region: null, contract };
}

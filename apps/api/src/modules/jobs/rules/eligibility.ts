import type { JobContract, JobRegion } from '../../../generated/prisma/enums.js';
import type { RawPosting } from '../types.js';
import { fold } from '../text.js';
import { requiredLanguage } from './language.js';

/**
 * Can someone living in Kosovo really apply? (PLAN D36, D38, D40.)
 *
 * The board shows a job only with positive evidence and nothing against it:
 *
 * 1. Anything that rules Kosovo out rejects the job: the company is marked as not hiring in
 *    Kosovo; citizenship, clearance, US payroll paperwork or a work permit; a required language
 *    rarely spoken in Kosovo; Kosovo named in an exclusion; "EU only"; living in a named place;
 *    required travel to a country that needs a visa (US, UK, Ireland, Canada, Australia); a
 *    country or region in the title; a list of countries without Kosovo; far time zones.
 * 2. Then one of these must hold: Kosovo or the Balkans is named; the job is open worldwide;
 *    it is open to Europe *and* something confirms Kosovo is included (a contractor or B2B
 *    role, an employer of record that covers Kosovo, "anywhere in Europe", or the admins'
 *    verdict on the company); or the location is just "Remote" and the posting hires
 *    contractors internationally or through an employer of record that covers Kosovo.
 *
 * "Europe" alone is not enough: Kosovo is outside the EU, many "Europe" jobs pay only through
 * EU entities, and some hiring systems have no Kosovo in their country list (no ISO code).
 * Anything unclear is left out.
 */

// ---- Places ----
const KOSOVO = /\bkosov[oa]\b/;
const BALKANS = /\b(kosov[oa]|balkans?|western balkans|south[- ]?east(ern)? europe)\b/;
const OPEN_WORLD =
  /\b(worldwide|world wide|anywhere|global(ly)?|any (location|country|timezone|time zone)|international|all countries)\b/;
const OPEN_WORLD_IN_TEXT =
  /\b((work|hire|hiring|recruit) (from )?(anywhere|worldwide|globally)|anywhere in the world|candidates (from )?(anywhere|worldwide|all over the world)|open to (candidates|applicants|people) (from )?(anywhere|worldwide|all countries)|location: (worldwide|anywhere))\b/;
const EUROPE =
  /\b(europe|european time ?zones?|emea|cet|cest|central european|gmt\+1|utc\+1|gmt ?\+ ?[0-2]|utc ?\+ ?[0-2])\b/;
const EU_ONLY = /\b(eu|european union|eea)\b/;
const ALL_PLACES = /\ball (countries|locations|regions|time ?zones)\b/;

/** Countries and regions that, named on their own, mean "not Kosovo". */
const ELSEWHERE = [
  'united states',
  'usa',
  'america',
  'north america',
  'americas',
  'latam',
  'latin america',
  'south america',
  'canada',
  'mexico',
  'brazil',
  'argentina',
  'colombia',
  'chile',
  'peru',
  'united kingdom',
  'great britain',
  'england',
  'scotland',
  'ireland',
  'uk&i',
  'apac',
  'asia',
  'asia pacific',
  'india',
  'pakistan',
  'bangladesh',
  'philippines',
  'indonesia',
  'vietnam',
  'thailand',
  'malaysia',
  'singapore',
  'japan',
  'korea',
  'china',
  'australia',
  'new zealand',
  'anz',
  'africa',
  'nigeria',
  'kenya',
  'south africa',
  'egypt',
  'middle east',
  'uae',
  'dubai',
  'saudi arabia',
  'israel',
  'turkey',
  'nordics',
  'dach',
  'benelux',
  'germany',
  'austria',
  'switzerland',
  'france',
  'spain',
  'portugal',
  'italy',
  'netherlands',
  'belgium',
  'poland',
  'czechia',
  'czech republic',
  'romania',
  'bulgaria',
  'hungary',
  'greece',
  'ukraine',
  'sweden',
  'norway',
  'denmark',
  'finland',
  'estonia',
  'latvia',
  'lithuania',
  'east coast',
  'west coast',
  'pst',
  'est',
  'cst',
  'mst',
];
const ELSEWHERE_RE = new RegExp(`\\b(${ELSEWHERE.join('|')})\\b`);
/** In titles, short codes only in capitals ("Account Executive (US)"), never "us" the word. */
const TITLE_CODES =
  /(^|[\s(/,|–-])(US|U\.S\.|USA|UK|EU|NA|EMEA|LATAM|APAC|ANZ|DACH)(?=$|[\s)/,|–-])/;

// ---- Hard blockers ----
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
    'us_payroll',
    /\b(i-9|form i9|e-verify|everify|(us|u\.s\.) bank account|(us|u\.s\.)[- ]based (bank|entity|llc)|(us|u\.s\.) (mailing )?address|us person)\b/,
  ],
  [
    'work_authorization',
    /\b(must|need to|required to|should) (already )?(be|have) (legally )?(authori[sz]ed|eligible|permitted|the right) to work (in|within|from) (the )?(us|u\.s\.|usa|united states|uk|united kingdom|eu|european union|eea|canada|australia|germany|france|spain|netherlands|ireland|poland|india|brazil|mexico)\b|\b(work authori[sz]ation|right to work|work permit) (in|for) (the )?(us|u\.s\.|usa|united states|uk|united kingdom|eu|european union|eea|canada|australia)\b|\bno (visa )?sponsorship\b.{0,60}\b(us|u\.s\.|united states|uk)\b/,
  ],
  [
    'eu_only',
    /\b(eu|eea|european union)(\/eea)? (residents?|citizens?|candidates?|applicants?|nationals?) only\b|\b(only|exclusively) (within|in|from) the (eu|eea|european union)\b|\b(based|located|living|residing|reside|live|work|working) (with)?in the (eu|eea|european union)\b/,
  ],
];

/** Kosovo (or the Balkans) named among the places the job is not open to. */
const EXCLUDED =
  /\b(except|excluding|exclude[sd]?|not (available|open|eligible) (in|to|for)|can ?not (hire|employ) (in|from|people in)|can't (hire|employ) (in|from)|unable to (hire|employ) (in|from)|with the exception of|other than)\b[^.\n]{0,200}\b(kosov[oa]|balkans?)\b/;

/** "must be based in X", "only candidates in X", "X-based applicants only". */
const RESIDENCE: RegExp[] = [
  /\b(must|should|need to|required to|have to) (currently )?(reside|live|be (located|based|resident)) (in|within) (?<place>[^.;\n]{0,60})/,
  /\b(only|exclusively) (open to |accepting |hiring |considering )?(candidates|applicants|residents|people|talent)( who are| currently)? (based |located |living |residing )?(in|from) (?<place>[^.;\n]{0,60})/,
  /\b(open|available) (only )?to (candidates|applicants|residents|people) (based |located |living |residing )?(in|from) (?<place>[^.;\n]{0,40}?) only\b/,
  /\b(?<place>[a-z. ]{2,30})[- ](based|located|resident) (candidates|applicants|talent) only\b/,
];

/** "We can hire in the following countries: …": a list that must include Kosovo. */
const COUNTRY_LIST =
  /\b(we (can|are able to|currently) (hire|employ)( people| candidates)?|we hire|hiring|open to (candidates|applicants)|candidates (must be|should be) (located|based)|eligible countries|countries we (can )?hire in|supported countries)\b[^:\n]{0,40}?\b(in|from)?\s*(the following countries|these countries|countries|following locations)\s*:?\s*(?<list>[^\n]{3,400})/;

/** Travel that needs a visa from Kosovo, stated as a requirement. */
const VISA_PLACES =
  /\b(the us|the u\.s\.|usa|united states|the uk|united kingdom|london|new york|nyc|san francisco|bay area|seattle|boston|austin|chicago|ireland|dublin|canada|toronto|vancouver|australia|sydney)\b/;
const TRAVEL = /\b(travel|trips?|visits?|on[- ]?site|in[- ]person|relocat\w*)\b/;
const MUST = /\b(required|mandatory|must|expected to|need to|will be required|is a requirement)\b/;
const OPTIONAL = /\b(plus|nice to have|bonus|optional|occasionally|if possible|preferred)\b/;

const KOSOVO_OFFSETS: [number, number] = [-1, 3];

// ---- How they are hired ----
const CONTRACT_TYPE =
  /\b(contract(or)?|freelance(r)?|b2b|self[- ]employed|independent|temporary|consult(ant|ing))\b/;
const CONTRACT_TEXT =
  /\b(independent contractor|as an? (contractor|freelancer|consultant)|(on )?an? (freelance|contract|contractor|consulting|b2b) (basis|agreement|contract|role|position)|b2b contract|contractor (role|position|agreement)|freelance (role|position))\b/;
/** Contractors hired internationally: the posting says so, or asks for the non-US tax form. */
const INTERNATIONAL_CONTRACT =
  /\b(w-?8ben|international contractors?|contractors? (from|in|around|across) (the world|all over the world|any country|many countries|\d+\+? countries)|(work|hire|hiring) (with )?(contractors|freelancers) (worldwide|globally|from anywhere|around the world))\b/;
/**
 * Employers of record whose own pages say they can employ people in Kosovo (checked November
 * 2026): Deel, WorkMotion, Safeguard Global, Skuad, RemoFirst. Remote.com's pages disagree,
 * so it is not on the list.
 */
const KOSOVO_EOR = /\b(deel|workmotion|safeguard global|skuad|remofirst)\b/;
const EUROPE_WIDE =
  /\b(anywhere in europe|all of europe|any (european country|country in europe)|across (all of )?europe|eu (and|or|&) non-eu|non-eu (countries|candidates|applicants|residents)|including non-eu|western balkans)\b/;

export interface EligibilityContext {
  /** The admins' verdict on the company: hires people in Kosovo (true), doesn't (false). */
  hiresInKosovo?: boolean | null;
}

export interface EligibilityResult {
  eligible: boolean;
  rule: string;
  region: JobRegion | null;
  contract: JobContract;
}

function placeIsOpen(place: string): boolean {
  return (
    OPEN_WORLD.test(place) ||
    ALL_PLACES.test(place) ||
    BALKANS.test(place) ||
    (EUROPE.test(place) && !EU_ONLY.test(place))
  );
}

/** The sentences of a text, folded. */
function sentences(text: string): string[] {
  return fold(text)
    .split(/[.;!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The title names a place other than Kosovo ("Account Executive (US)", "Support – LATAM"). */
function titleNamesElsewhere(title: string): boolean {
  const folded = fold(title);
  if (OPEN_WORLD.test(folded) || BALKANS.test(folded) || EUROPE.test(folded)) return false;
  if (TITLE_CODES.test(title)) return true;
  // Only the place part of a title: after a dash, comma, bar or slash, or in parentheses.
  const parts = [
    ...[...title.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]),
    ...title.split(/\s[-–—|/]\s|,\s/).slice(1),
  ].map(fold);
  return parts.some((part) => ELSEWHERE_RE.test(part));
}

export function checkEligibility(p: RawPosting, ctx: EligibilityContext = {}): EligibilityResult {
  const description = fold(p.description);
  const where = fold([p.locationText, ...p.regions].join(' | '));
  const everything = `${fold(p.title)} | ${where} | ${description}`;

  const contract: JobContract =
    CONTRACT_TYPE.test(fold(p.employmentType)) || CONTRACT_TEXT.test(everything)
      ? 'CONTRACTOR'
      : p.employmentType
        ? 'EMPLOYEE'
        : 'UNKNOWN';
  const no = (rule: string): EligibilityResult => ({
    eligible: false,
    rule: `not_eligible:${rule}`,
    region: null,
    contract,
  });
  const yes = (rule: string, region: JobRegion): EligibilityResult => ({
    eligible: true,
    rule: `eligible:${rule}`,
    region,
    contract,
  });

  // ---- 1. Anything against ----
  if (ctx.hiresInKosovo === false) return no('company');
  for (const [name, re] of BLOCKERS) if (re.test(everything)) return no(name);
  const language = requiredLanguage(p.title, p.description);
  if (language) return no(`language:${language}`);
  if (EXCLUDED.test(everything)) return no('excluded');
  for (const re of RESIDENCE) {
    const place = everything.match(re)?.groups?.place;
    if (place !== undefined && !placeIsOpen(place)) return no('residence');
  }
  const travel = sentences(p.description).some(
    (s) => TRAVEL.test(s) && VISA_PLACES.test(s) && MUST.test(s) && !OPTIONAL.test(s),
  );
  if (travel) return no('travel_visa');
  if (titleNamesElsewhere(p.title)) return no('title_location');
  const zones = p.timezones ?? [];
  if (zones.length > 0 && !zones.some((z) => z >= KOSOVO_OFFSETS[0] && z <= KOSOVO_OFFSETS[1]))
    return no('timezone');
  const listed = description.match(COUNTRY_LIST)?.groups?.list;
  if (listed !== undefined) {
    if (KOSOVO.test(listed)) return yes('kosovo_listed', 'KOSOVO');
    if (ELSEWHERE_RE.test(listed)) return no('countries_text');
  }

  // ---- 2. Evidence for ----
  const companyYes = ctx.hiresInKosovo === true;
  const europeConfirmed =
    contract === 'CONTRACTOR' ||
    KOSOVO_EOR.test(everything) ||
    EUROPE_WIDE.test(everything) ||
    companyYes;

  // A job board's list of countries is where applicants must live.
  if (p.regions.length > 0) {
    const list = fold(p.regions.join(' | '));
    if (KOSOVO.test(list)) return yes('kosovo_listed', 'KOSOVO');
    if (BALKANS.test(list)) return yes('balkans', 'BALKANS');
    if (OPEN_WORLD.test(list)) return yes('worldwide', 'WORLDWIDE');
    if (EUROPE.test(list) && !EU_ONLY.test(list))
      return europeConfirmed ? yes('europe', 'EUROPE') : no('europe_unconfirmed');
    return no('countries');
  }

  if (KOSOVO.test(where) || KOSOVO.test(description)) return yes('kosovo', 'KOSOVO');
  if (BALKANS.test(where)) return yes('balkans', 'BALKANS');

  // An empty Himalayas list means worldwide (their API documentation).
  const boardSaysOpen =
    p.source === 'HIMALAYAS' ||
    (p.source === 'REMOTEOK' &&
      where.replace(/[|\s]/g, '') === '' &&
      OPEN_WORLD_IN_TEXT.test(description));
  if (OPEN_WORLD.test(where) || boardSaysOpen) return yes('worldwide', 'WORLDWIDE');

  if (EUROPE.test(where)) {
    if (EU_ONLY.test(where) && !EUROPE_WIDE.test(everything)) return no('eu_only');
    return europeConfirmed ? yes('europe', 'EUROPE') : no('europe_unconfirmed');
  }

  const locationIsBare = /^(remote|fully remote|100% remote|remote only|)$/.test(
    where
      .replace(/[|,()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  if (!locationIsBare) return no(EU_ONLY.test(where) ? 'eu_only' : 'location');
  if (OPEN_WORLD_IN_TEXT.test(description)) return yes('worldwide_text', 'WORLDWIDE');
  if (contract === 'CONTRACTOR' && INTERNATIONAL_CONTRACT.test(everything))
    return yes('contractor', 'CONTRACT_ANYWHERE');
  if (KOSOVO_EOR.test(everything)) return yes('global_employer', 'GLOBAL_EMPLOYER');
  if (companyYes) return yes('company', 'KOSOVO');
  return no('no_evidence');
}

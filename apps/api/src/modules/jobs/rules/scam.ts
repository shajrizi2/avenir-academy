import type { JobCategory } from '../../../generated/prisma/enums.js';
import type { RawPosting } from '../types.js';
import { fold, hostOf } from '../text.js';

/**
 * Scam score (PLAN D36): 0–2 is published, 3 or more is rejected. Jobs read straight from a
 * company's career page start at 0, jobs from job boards at 1; each warning sign adds 2.
 */
export const SCAM_LIMIT = 3;

const SIGNS: [string, RegExp][] = [
  [
    'fee',
    /\b((registration|training|application|processing|onboarding|placement|enrol(l)?ment) fee|starter kit|pay (a|the|an) (fee|deposit)|deposit (is )?required|(buy|purchase) (your own )?(equipment|software|kit) (and|which) (we|will be) reimburs)/,
  ],
  [
    'chat_app_contact',
    /\b((contact|message|text|apply|reach|send)( us| me)? (via|on|through|by) (telegram|whatsapp|signal|wechat)|t\.me\/|wa\.me\/)/,
  ],
  [
    'odd_payment',
    /\b(paid (in|with|via) (crypto|cryptocurrency|usdt|bitcoin|btc)|usdt|payment (via|in) crypto|cashier'?s check|(check|cheque) (will be )?(mailed|sent) to you)\b/,
  ],
  [
    'reshipping',
    /\b(reship(ping)?|package (forwarding|handling) (agent|assistant)|receive (and forward )?packages)\b/,
  ],
  [
    'too_good',
    /\b(earn (up to )?\$ ?\d[\d,]* ?(per|a|\/) ?(day|week)|no experience (needed|required)[^.]{0,60}\$ ?\d|get paid (daily|instantly))\b/,
  ],
];

const FREE_MAIL =
  /\b[a-z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|proton(mail)?|icloud|aol|mail|yandex)\.(com|me|ru)\b/;

/** Hosts an apply link may point to without suspicion. */
const KNOWN_HOSTS = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workable.com',
  'remoteok.com',
  'remoteok.io',
  'jobicy.com',
  'himalayas.app',
  'smartrecruiters.com',
  'recruitee.com',
  'personio.de',
  'personio.com',
  'bamboohr.com',
  'breezy.hr',
  'teamtailor.com',
  'workday.com',
  'myworkdayjobs.com',
  'icims.com',
  'jobvite.com',
  'linkedin.com',
];
const BAD_HOSTS =
  /^(bit\.ly|tinyurl\.com|forms\.gle|t\.me|wa\.me|cutt\.ly|rb\.gy|shorturl\.at|goo\.gl)$|^docs\.google\.com$/;

const LOW_PAY_ROLES =
  /\b(data entry|typist|virtual assistant|chat (moderator|agent|operator)|copy paste|survey taker)\b/;

function yearly(value: number, period: string | null): number {
  if (period === 'HOUR') return value * 2000;
  if (period === 'MONTH') return value * 12;
  return value;
}

export interface ScamInput {
  posting: RawPosting;
  category: JobCategory;
  companyWebsite?: string | null;
  /** True when the company or apply domain is on the blocklist. */
  blocked: boolean;
}

export interface ScamResult {
  score: number;
  reasons: string[];
}

export function scamScore({ posting: p, companyWebsite, blocked }: ScamInput): ScamResult {
  if (blocked) return { score: 99, reasons: ['blocklist'] };
  const reasons: string[] = [];
  let score = ['GREENHOUSE', 'LEVER', 'ASHBY', 'WORKABLE'].includes(p.source) ? 0 : 1;
  const text = fold(`${p.title}\n${p.description}`);

  for (const [name, re] of SIGNS) {
    if (re.test(text)) {
      score += 2;
      reasons.push(name);
    }
  }
  if (FREE_MAIL.test(text)) {
    score += 2;
    reasons.push('free_mail_contact');
  }

  const host = hostOf(p.applyUrl);
  const siteHost = companyWebsite ? hostOf(companyWebsite) : null;
  const known =
    host !== null &&
    (KNOWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ||
      (siteHost !== null && (host === siteHost || host.endsWith(`.${siteHost}`))));
  if (host === null || BAD_HOSTS.test(host)) {
    score += 3;
    reasons.push('bad_apply_link');
  } else if (
    !known &&
    p.source !== 'GREENHOUSE' &&
    p.source !== 'LEVER' &&
    p.source !== 'ASHBY' &&
    p.source !== 'WORKABLE'
  ) {
    // An unknown company domain from a job board is common and fine; only note it.
    reasons.push('unverified_apply_domain');
  }

  const max = p.salary?.max ?? p.salary?.min ?? null;
  if (max !== null) {
    const perYear = yearly(max, p.salary?.period ?? 'YEAR');
    if (perYear > 1_000_000 || (LOW_PAY_ROLES.test(fold(p.title)) && perYear > 60_000)) {
      score += 2;
      reasons.push('salary_too_high');
    }
  }
  return { score, reasons };
}

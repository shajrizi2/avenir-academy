import type { RawPosting } from '../types.js';
import { fold } from '../text.js';

/** Boards that list remote jobs only. */
const REMOTE_ONLY_SOURCES = new Set(['REMOTEOK', 'JOBICY', 'HIMALAYAS']);

const NOT_REMOTE_SHORT = /\b(hybrid|on[- ]?site|in[- ]office|office[- ]based)\b/;
const NOT_REMOTE_LONG =
  /\b(this is an? (hybrid|on[- ]?site|in[- ]office) (role|position|job)|hybrid (role|position|working model|schedule)|\d\s*(days?|x) (a|per) week (in|at|from) (the|our) office|(must|required to|need to|able to) (commute|work from (the|our) office)|relocation (is )?(required|mandatory)|must (be willing to )?relocate)\b/;
const REMOTE_WORDS = /\b(remote|anywhere|worldwide|work from home|wfh|distributed|home[- ]based)\b/;

export interface RemoteResult {
  remote: boolean;
  rule: string;
}

/** Is the job 100% remote? Hybrid, on-site and relocation jobs are not. */
export function checkRemote(p: RawPosting): RemoteResult {
  if (p.workplace === 'hybrid' || p.workplace === 'onsite') {
    return { remote: false, rule: `not_remote:${p.workplace}` };
  }
  const short = fold(`${p.title} ${p.locationText}`);
  if (NOT_REMOTE_SHORT.test(short)) return { remote: false, rule: 'not_remote:title_or_location' };
  if (NOT_REMOTE_LONG.test(fold(p.description)))
    return { remote: false, rule: 'not_remote:description' };
  if (REMOTE_ONLY_SOURCES.has(p.source)) return { remote: true, rule: 'remote:board' };
  if (p.remote === true || p.workplace === 'remote') return { remote: true, rule: 'remote:flag' };
  if (REMOTE_WORDS.test(short)) return { remote: true, rule: 'remote:location' };
  return { remote: false, rule: 'not_remote:no_signal' };
}

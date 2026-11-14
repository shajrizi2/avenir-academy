import type {
  JobCategory,
  JobContract,
  JobRegion,
  JobSourceKind,
} from '../../generated/prisma/enums.js';

/** A company career page read directly (Greenhouse, Lever, Ashby, Workable). */
export type AtsKind = Extract<JobSourceKind, 'GREENHOUSE' | 'LEVER' | 'ASHBY' | 'WORKABLE'>;
/** A remote job board's feed. Feeds show a window of recent jobs, not every open job. */
export type FeedKind = Extract<JobSourceKind, 'REMOTEOK' | 'JOBICY' | 'HIMALAYAS'>;

export const ATS_KINDS: readonly AtsKind[] = ['GREENHOUSE', 'LEVER', 'ASHBY', 'WORKABLE'];
export const FEED_KINDS: readonly FeedKind[] = ['REMOTEOK', 'JOBICY', 'HIMALAYAS'];

export interface Salary {
  min: number | null;
  max: number | null;
  currency: string | null;
  /** YEAR, MONTH or HOUR. */
  period: 'YEAR' | 'MONTH' | 'HOUR' | null;
}

/** One job posting as a source gave it, in a common shape. */
export interface RawPosting {
  source: JobSourceKind;
  /** The source's own ID for the posting (unique per source). */
  externalId: string;
  /** The posting's page on the source. */
  sourceUrl: string;
  /** Where "Apliko" sends people. */
  applyUrl: string;
  /** Where the job really lives when the source is a job board (often a company career page). */
  targetUrl?: string | null;
  title: string;
  company: string;
  companyWebsite?: string | null;
  /** Free-text location ("Remote - Europe", "Worldwide", "New York, NY"). */
  locationText: string;
  /** Countries or regions the source says applicants must be in (Himalayas, Jobicy). */
  regions: string[];
  /** The source's own remote flag, when it has one. */
  remote: boolean | null;
  /** remote / hybrid / onsite, when the source says. */
  workplace: 'remote' | 'hybrid' | 'onsite' | null;
  /** The source's contract or commitment label ("Contract", "Full-time", "Contractor"). */
  employmentType: string | null;
  /** Plain-text description, used by the rules only (never stored or shown). */
  description: string;
  /** The source's category or department labels. */
  sourceCategories: string[];
  postedAt: Date | null;
  salary: Salary | null;
}

/** What the rules decided for one posting. */
export interface Decision {
  publish: boolean;
  /** The rule that rejected the job, or the one that made it eligible. */
  rule: string;
  region: JobRegion | null;
  contract: JobContract;
  category: JobCategory;
  scamScore: number;
  scamReasons: string[];
}

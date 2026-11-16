import { z } from 'zod';
import { emailSchema } from './schemas/auth.js';

/** Job board (PLAN D36): what the website shows and sends. */

export const JOB_CATEGORIES = [
  'ENGINEERING',
  'AI_DATA',
  'MARKETING',
  'DESIGN',
  'PRODUCT',
  'SALES',
  'SUPPORT',
  'WRITING',
  'FINANCE_ADMIN',
  'HR',
  'OTHER',
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

/** Albanian address slugs for the category lists (`/?kategoria=marketing`). */
export const JOB_CATEGORY_SLUGS: Record<JobCategory, string> = {
  ENGINEERING: 'inxhinieri',
  AI_DATA: 'ai-dhe-te-dhena',
  MARKETING: 'marketing',
  DESIGN: 'dizajn',
  PRODUCT: 'produkt',
  SALES: 'shitje',
  SUPPORT: 'mbeshtetje',
  WRITING: 'shkrim',
  FINANCE_ADMIN: 'finance-dhe-administrate',
  HR: 'burime-njerezore',
  OTHER: 'tjeter',
};

export function jobCategoryFromSlug(slug: string | null | undefined): JobCategory | null {
  if (!slug) return null;
  const entry = Object.entries(JOB_CATEGORY_SLUGS).find(([, s]) => s === slug);
  return entry ? (entry[0] as JobCategory) : null;
}

export type JobRegion =
  'KOSOVO' | 'WORLDWIDE' | 'EUROPE' | 'BALKANS' | 'CONTRACT_ANYWHERE' | 'GLOBAL_EMPLOYER';
export type JobContract = 'EMPLOYEE' | 'CONTRACTOR' | 'UNKNOWN';
/** The job boards whose terms require a visible credit. */
export type JobFeedSource = 'REMOTEOK' | 'JOBICY' | 'HIMALAYAS';

export const JOB_PAGE_SIZE = 30;

export interface PublicJob {
  id: string;
  title: string;
  company: string;
  category: JobCategory;
  contract: JobContract;
  region: JobRegion;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: 'YEAR' | 'MONTH' | 'WEEK' | 'HOUR' | null;
  /** One or two sentences about the job, when the source gave any. */
  summary: string | null;
  applyUrl: string;
  postedAt: string;
  /** False once the job has closed (saved jobs keep showing it). */
  open: boolean;
}

/** GET /jobs/status. */
export interface JobBoardStatus {
  /** "/" shows the board (SiteSettings.jobBoardPublic). */
  public: boolean;
  /** Visitors are asked to sign in after 10 seconds: only when the codes can be emailed. */
  signIn: boolean;
}

export interface JobBoardPage {
  /** Whether the board is switched on for everyone (SiteSettings.jobBoardPublic). */
  public: boolean;
  jobs: PublicJob[];
  total: number;
  page: number;
  pageSize: number;
  /** Open jobs first seen today (Europe/Tirane), across all categories. */
  newToday: number;
  /** Open jobs across all categories. */
  totalOpen: number;
  categories: { category: JobCategory; count: number }[];
}

export const JOB_SEARCH_MAX_LENGTH = 100;

export const jobBoardQuerySchema = z.object({
  q: z.string().trim().max(JOB_SEARCH_MAX_LENGTH).optional(),
  category: z.enum(JOB_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
});

export const JOB_CODE_LENGTH = 6;
export const JOB_CODE_MINUTES = 10;
export const JOB_SESSION_DAYS = 365;

export const jobSeekerEmailSchema = z.object({ email: emailSchema });
export type JobSeekerEmailInput = z.infer<typeof jobSeekerEmailSchema>;

export const jobSeekerVerifySchema = jobSeekerEmailSchema.extend({
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${JOB_CODE_LENGTH}}$`), 'Shkruaj kodin me 6 shifra nga email-i'),
});
export type JobSeekerVerifyInput = z.infer<typeof jobSeekerVerifySchema>;

export interface JobSeekerMe {
  email: string;
}

// ---- Admin (PLAN D36) ----

export type JobSourceKind = 'GREENHOUSE' | 'LEVER' | 'ASHBY' | 'WORKABLE' | JobFeedSource;

export interface AdminJobRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'RUNNING' | 'OK' | 'FAILED';
  stats: {
    seen?: number;
    created?: number;
    published?: number;
    discovered?: number;
    linkChecks?: number;
    rejected?: Record<string, number>;
    closed?: Record<string, number>;
    sources?: { name: string; ok: boolean; postings: number; error?: string }[];
  } | null;
  errors: string[] | null;
}

export interface AdminJobFeed {
  kind: JobFeedSource;
  enabled: boolean;
  failCount: number;
  lastSuccessAt: string | null;
  lastError: string | null;
  pausedUntil: string | null;
}

export interface AdminJobsOverview {
  runs: AdminJobRun[];
  feeds: AdminJobFeed[];
  counts: { open: number; rejected: number; hidden: number; closed: number };
}

export interface AdminJobCompany {
  id: string;
  name: string;
  ats: JobSourceKind | null;
  boardToken: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'BLOCKED';
  /** The admins' verdict (PLAN D40): hires people in Kosovo, doesn't, or unknown (null). */
  hiresInKosovo: boolean | null;
  discoveredFrom: string | null;
  lastFetchedAt: string | null;
  failCount: number;
  openJobs: number;
}

export interface AdminJobBlock {
  id: string;
  kind: 'COMPANY' | 'DOMAIN';
  value: string;
  reason: string;
  createdAt: string;
}

export interface AdminHiddenJob {
  id: string;
  title: string;
  company: string;
  applyUrl: string;
}

export const addJobCompanySchema = z.object({
  name: z.string().trim().min(1, 'Shkruaj emrin e kompanisë').max(120),
  careersUrl: z.url('Ngjit lidhjen e faqes së karrierës'),
});
export type AddJobCompanyInput = z.infer<typeof addJobCompanySchema>;

export const addJobBlockSchema = z.object({
  kind: z.enum(['COMPANY', 'DOMAIN']),
  value: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(200),
});
export type AddJobBlockInput = z.infer<typeof addJobBlockSchema>;

// ---- Subscribers and campaigns (PLAN D37) ----

export interface AdminSubscriber {
  id: string;
  email: string;
  marketingConsent: boolean;
  consentAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface AdminSubscribers {
  total: number;
  consenting: number;
  subscribers: AdminSubscriber[];
}

export type CampaignStatus = 'DRAFT' | 'SENDING' | 'SENT' | 'CANCELLED';

export interface AdminCampaign {
  id: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  recipients: number;
  sent: number;
  failed: number;
}

export const CAMPAIGN_SUBJECT_MAX = 150;
export const CAMPAIGN_BODY_MAX = 10_000;

export const campaignSchema = z.object({
  subject: z.string().trim().min(1, 'Shkruaj titullin e email-it').max(CAMPAIGN_SUBJECT_MAX),
  body: z.string().trim().min(1, 'Shkruaj tekstin e email-it').max(CAMPAIGN_BODY_MAX),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

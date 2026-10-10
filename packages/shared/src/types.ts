import type { Locale } from './constants.js';
import type {
  AttemptStatus,
  EnrollmentStatus,
  MaterialKind,
  ModuleStatus,
  QuestionType,
  Role,
} from './enums.js';

/** Dates travel over JSON as ISO-8601 UTC strings. */
export type IsoDateString = string;

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  createdAt: IsoDateString;
}

export interface AuthResponse {
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  user: PublicUser;
}

export interface MessageResponse {
  message: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InstructorSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ModuleSummary {
  id: string;
  order: number;
  title: string;
  description: string;
  durationWeeks: number;
  instructor: InstructorSummary | null;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  startDate: IsoDateString | null;
  isPublished: boolean;
  moduleCount: number;
}

export interface CourseDetail extends Omit<CourseSummary, 'moduleCount'> {
  description: string;
  modules: ModuleSummary[];
}

export interface EnrollmentSummary {
  id: string;
  status: EnrollmentStatus;
  createdAt: IsoDateString;
  decidedAt: IsoDateString | null;
  course: Pick<CourseSummary, 'id' | 'slug' | 'title' | 'summary'>;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Public instructor card on the landing page (no contact details). */
export interface PublicInstructor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
}

export interface PublicTestimonial {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  avatarUrl: string | null;
  locale: Locale;
}

/** Landing-page values editable without a deploy (SiteSettings row). */
export interface SiteSettings {
  nextCohortStart: IsoDateString | null;
  scheduleSq: string | null;
  scheduleEn: string | null;
  seatsTotal: number | null;
  /** Whole currency units; null means "contact us". */
  priceAmount: number | null;
  priceCurrency: string;
  priceNoteSq: string | null;
  priceNoteEn: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
}

// ---- Sprint 2: enrollments, modules, live sessions, materials ----

/** A user as staff see them in admin lists and attendance rosters. */
export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CourseRef {
  id: string;
  slug: string;
  title: string;
}

export interface AdminEnrollment {
  id: string;
  status: EnrollmentStatus;
  note: string | null;
  createdAt: IsoDateString;
  decidedAt: IsoDateString | null;
  user: PersonSummary;
  course: CourseRef;
}

export interface ModuleRef {
  id: string;
  order: number;
  title: string;
  course: CourseRef;
}

export interface LiveSessionSummary {
  id: string;
  moduleId: string;
  title: string;
  startsAt: IsoDateString;
  durationMin: number;
  /**
   * Always present for the module's instructor and admins. Students get it only while the
   * session is joinable (from SESSION_JOIN_WINDOW_MIN before the start until it ends).
   */
  meetUrl: string | null;
}

/** A session in the staff list, with how many students were marked present. */
export interface StaffSession extends LiveSessionSummary {
  presentCount: number;
}

/** An upcoming session on the student dashboard. */
export interface StudentSession extends LiveSessionSummary {
  module: ModuleRef;
}

export interface AttendanceRecord {
  user: PersonSummary;
  /** null = not recorded yet. */
  present: boolean | null;
}

export interface SessionAttendance {
  session: LiveSessionSummary & { module: ModuleRef };
  records: AttendanceRecord[];
}

export interface MaterialSummary {
  id: string;
  title: string;
  kind: MaterialKind;
  /** The link for LINK materials; null for files (download via GET /materials/:id/download). */
  url: string | null;
  /** Original file extension for FILE materials, e.g. "pdf". */
  fileType: string | null;
}

/** GET /modules/:id: an enrolled student (unlocked module), its instructor, or an admin. */
export interface ModuleDetail extends ModuleSummary {
  course: CourseRef;
  /** The student's own status; null for staff. */
  status: ModuleStatus | null;
  /** True for the module's instructor and admins. */
  canManage: boolean;
  sessions: LiveSessionSummary[];
  materials: MaterialSummary[];
  /** The module's test. Students only see it once it is published. */
  test: ModuleTest | null;
}

/** GET /me/courses/:slug: an approved student's view of a course. */
export interface LearnCourse extends CourseRef {
  summary: string;
  modules: (ModuleSummary & { status: ModuleStatus })[];
}

/** GET /me/modules: modules an instructor teaches (all modules for admins). */
export interface TeachingModule extends ModuleRef {
  nextSession: LiveSessionSummary | null;
  sessionCount: number;
  materialCount: number;
  studentCount: number;
}

export interface AdminTestimonial extends PublicTestimonial {
  isPublished: boolean;
  createdAt: IsoDateString;
}

// ---- Sprint 3: tests, attempts, progression, dashboards ----

export interface TestSettings {
  id: string;
  title: string;
  passMark: number;
  timeLimitMin: number;
  maxAttempts: number;
  opensAt: IsoDateString;
  closesAt: IsoDateString;
  isPublished: boolean;
}

/** The test card on a module page. */
export interface ModuleTest extends TestSettings {
  questionCount: number;
}

export interface StaffOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface StaffQuestion {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  points: number;
  options: StaffOption[];
}

/** The test builder's view: correct answers included. Staff only. */
export interface StaffTest extends TestSettings {
  moduleId: string;
  questions: StaffQuestion[];
  /** Questions can't be changed once anyone has started an attempt. */
  attemptCount: number;
}

/** GET /modules/:id/test */
export interface TestBuilderData {
  test: StaffTest | null;
  /** The suggested window for a new test: the module's last week. */
  defaultWindow: { opensAt: IsoDateString; closesAt: IsoDateString };
}

export interface AttemptSummary {
  id: string;
  status: AttemptStatus;
  startedAt: IsoDateString;
  /** Start + time limit, but never later than the window's close. */
  deadline: IsoDateString;
  submittedAt: IsoDateString | null;
  scorePct: number | null;
  passed: boolean | null;
}

/** GET /tests/:id: a student's overview of a test (no questions). */
export interface StudentTest extends TestSettings {
  module: ModuleRef;
  questionCount: number;
  totalPoints: number;
  /** The student's status in the module. */
  status: ModuleStatus;
  /** Newest first. */
  attempts: AttemptSummary[];
  attemptsLeft: number;
  activeAttemptId: string | null;
  /** The next module, once it is open for the student. */
  nextModule: ModuleRef | null;
}

/** A question as a student sees it: never with the correct answers. */
export interface AttemptQuestion {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  points: number;
  options: { id: string; text: string }[];
}

/** Question id → chosen option ids. */
export type AttemptAnswers = Record<string, string[]>;

/** POST /tests/:id/attempts and GET /attempts/:id: an attempt in progress. */
export interface AttemptSession extends AttemptSummary {
  testId: string;
  title: string;
  questions: AttemptQuestion[];
  answers: AttemptAnswers;
}

/** POST /attempts/:id/submit */
export interface AttemptResult {
  attempt: AttemptSummary;
  passMark: number;
  /** The module's status after grading. */
  moduleStatus: ModuleStatus;
  attemptsLeft: number;
  /** The module this pass unlocked, if any. */
  nextModule: ModuleRef | null;
}

export interface TestResultRow {
  /** The student's progress row, for the admin override (PATCH /progress/:id). */
  progressId: string | null;
  user: PersonSummary;
  status: ModuleStatus;
  attemptsUsed: number;
  attemptsLeft: number;
  bestScore: number | null;
  lastAttempt: AttemptSummary | null;
}

/** GET /tests/:id/results */
export interface TestResults {
  test: ModuleTest & { module: ModuleRef };
  rows: TestResultRow[];
}

export interface ProgressModule {
  id: string;
  order: number;
  title: string;
  status: ModuleStatus;
}

/** GET /me/progress: one entry per approved course. */
export interface CourseProgress {
  course: CourseRef;
  totalModules: number;
  passedModules: number;
  modules: ProgressModule[];
  /** The first module that isn't passed and isn't locked, with its published test. */
  current:
    (ProgressModule & { test: Pick<TestSettings, 'id' | 'opensAt' | 'closesAt'> | null }) | null;
}

/** PATCH /progress/:id */
export interface ProgressRecord {
  id: string;
  status: ModuleStatus;
  unlockedAt: IsoDateString | null;
  passedAt: IsoDateString | null;
}

/** GET /admin/stats */
export interface AdminStats {
  students: number;
  instructors: number;
  publishedCourses: number;
  pendingEnrollments: number;
  approvedEnrollments: number;
  sessionsNext7Days: number;
  openTests: number;
  attemptsLast30Days: number;
  /** Share of finished attempts in the last 30 days that passed; null without attempts. */
  passRateLast30Days: number | null;
  /** Students whose module is FAILED (no attempts left), waiting for an admin. */
  failedModules: number;
}

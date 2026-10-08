import type { Locale } from './constants.js';
import type { EnrollmentStatus, MaterialKind, ModuleStatus, Role } from './enums.js';

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

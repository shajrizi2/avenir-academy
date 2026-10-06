import type { EnrollmentStatus, Role } from './enums.js';

/** Dates travel over JSON as ISO-8601 UTC strings. */
export type IsoDateString = string;

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
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

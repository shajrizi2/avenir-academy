import type {
  AdminEnrollment,
  AdminGroup,
  AdminPayment,
  AdminStats,
  AdminTestimonial,
  AttemptSession,
  CourseDetail,
  CourseProgress,
  CourseSummary,
  EmailLogEntry,
  EmailType,
  EnrollmentStatus,
  EnrollmentSummary,
  GroupStudent,
  GroupSummary,
  LearnCourse,
  LessonDetail,
  LessonSummary,
  ModuleDetail,
  NextLesson,
  Paginated,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
  PublicUser,
  Role,
  SessionAttendance,
  SiteSettings,
  StaffSession,
  StudentSession,
  StudentTest,
  TeachingModule,
  TestBuilderData,
  TestResults,
} from '@ai-academy/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from './api';

/**
 * The Meet link reaches students only from 15 minutes before a session starts, so pages
 * with join buttons refetch on this interval.
 */
const JOIN_REFRESH_MS = 30_000;

export const myEnrollmentsQuery = queryOptions({
  queryKey: ['me', 'enrollments'],
  queryFn: () => apiFetch<EnrollmentSummary[]>('/me/enrollments'),
});

export const upcomingSessionsQuery = queryOptions({
  queryKey: ['me', 'sessions', 'upcoming'],
  queryFn: () => apiFetch<StudentSession[]>('/me/sessions/upcoming'),
  refetchInterval: JOIN_REFRESH_MS,
});

export const learnCourseQuery = (slug: string) =>
  queryOptions({
    queryKey: ['me', 'courses', slug],
    queryFn: () => apiFetch<LearnCourse>(`/me/courses/${encodeURIComponent(slug)}`),
  });

export const moduleQuery = (id: string) =>
  queryOptions({
    queryKey: ['modules', id],
    queryFn: () => apiFetch<ModuleDetail>(`/modules/${encodeURIComponent(id)}`),
    refetchInterval: JOIN_REFRESH_MS,
  });

export const teachingModulesQuery = queryOptions({
  queryKey: ['me', 'modules'],
  queryFn: () => apiFetch<TeachingModule[]>('/me/modules'),
});

export const moduleSessionsQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ['modules', moduleId, 'sessions'],
    queryFn: () => apiFetch<StaffSession[]>(`/modules/${encodeURIComponent(moduleId)}/sessions`),
  });

export const attendanceQuery = (sessionId: string) =>
  queryOptions({
    queryKey: ['sessions', sessionId, 'attendance'],
    queryFn: () =>
      apiFetch<SessionAttendance>(`/sessions/${encodeURIComponent(sessionId)}/attendance`),
  });

// ---- Groups, payments and lessons ----

/** Open groups of a course (public), with real seats left. */
export const courseGroupsQuery = (courseId: string) =>
  queryOptions({
    queryKey: ['groups', 'course', courseId],
    queryFn: () => apiFetch<GroupSummary[]>('/groups', { query: { courseId } }),
  });

export const groupQuery = (id: string) =>
  queryOptions({
    queryKey: ['groups', id],
    queryFn: () => apiFetch<GroupSummary>(`/groups/${encodeURIComponent(id)}`),
  });

export const paymentMethodsQuery = queryOptions({
  queryKey: ['payments', 'methods'],
  queryFn: () => apiFetch<PaymentMethod[]>('/payments/methods'),
});

export const myPaymentsQuery = queryOptions({
  queryKey: ['me', 'payments'],
  queryFn: () => apiFetch<PaymentSummary[]>('/me/payments'),
});

export const myPaymentQuery = (id: string) =>
  queryOptions({
    queryKey: ['me', 'payments', id],
    queryFn: () => apiFetch<PaymentSummary>(`/me/payments/${encodeURIComponent(id)}`),
  });

export const lessonQuery = (id: string) =>
  queryOptions({
    queryKey: ['lessons', id],
    queryFn: () => apiFetch<LessonDetail>(`/lessons/${encodeURIComponent(id)}`),
  });

export const moduleLessonsQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ['modules', moduleId, 'lessons'],
    queryFn: () => apiFetch<LessonSummary[]>(`/modules/${encodeURIComponent(moduleId)}/lessons`),
  });

export const nextLessonQuery = queryOptions({
  queryKey: ['me', 'next-lesson'],
  queryFn: () => apiFetch<NextLesson | null>('/me/next-lesson'),
});

// ---- Tests and progress ----

export const myProgressQuery = queryOptions({
  queryKey: ['me', 'progress'],
  queryFn: () => apiFetch<CourseProgress[]>('/me/progress'),
});

/** The test builder: the module's test with correct answers (staff only). */
export const testBuilderQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ['modules', moduleId, 'test'],
    queryFn: () => apiFetch<TestBuilderData>(`/modules/${encodeURIComponent(moduleId)}/test`),
  });

export const testResultsQuery = (testId: string) =>
  queryOptions({
    queryKey: ['tests', testId, 'results'],
    queryFn: () => apiFetch<TestResults>(`/tests/${encodeURIComponent(testId)}/results`),
  });

/** A student's overview of a test: rules, their attempts, attempts left. */
export const studentTestQuery = (testId: string) =>
  queryOptions({
    queryKey: ['tests', testId],
    queryFn: () => apiFetch<StudentTest>(`/tests/${encodeURIComponent(testId)}`),
  });

/** An attempt in progress. The runner owns the answers, so this is never refetched. */
export const attemptQuery = (attemptId: string) =>
  queryOptions({
    queryKey: ['attempts', attemptId],
    queryFn: () => apiFetch<AttemptSession>(`/attempts/${encodeURIComponent(attemptId)}`),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

// ---- Admin ----

export const adminStatsQuery = queryOptions({
  queryKey: ['admin', 'stats'],
  queryFn: () => apiFetch<AdminStats>('/admin/stats'),
});

export interface UsersQueryParams {
  page: number;
  pageSize: number;
  q?: string;
  role?: Role;
}

export const usersQuery = (params: UsersQueryParams) =>
  queryOptions({
    queryKey: ['users', params],
    queryFn: () => apiFetch<Paginated<PublicUser>>('/users', { query: { ...params } }),
    placeholderData: keepPreviousData,
  });

/** Every instructor, for assignment selects and the instructors page. */
export const instructorsQuery = queryOptions({
  queryKey: ['users', 'instructors'],
  queryFn: () =>
    apiFetch<Paginated<PublicUser>>('/users', {
      query: { role: 'INSTRUCTOR', page: 1, pageSize: 100 },
    }).then((page) => page.items),
});

export interface EnrollmentsQueryParams {
  status?: EnrollmentStatus;
  groupId?: string;
  page: number;
  pageSize: number;
}

export const enrollmentsQuery = (params: EnrollmentsQueryParams) =>
  queryOptions({
    queryKey: ['enrollments', params],
    queryFn: () => apiFetch<Paginated<AdminEnrollment>>('/enrollments', { query: { ...params } }),
    placeholderData: keepPreviousData,
  });

export const adminCoursesQuery = queryOptions({
  queryKey: ['courses', 'all'],
  queryFn: () => apiFetch<CourseSummary[]>('/courses', { query: { all: true } }),
});

export const adminCourseQuery = (id: string) =>
  queryOptions({
    queryKey: ['courses', 'by-id', id],
    queryFn: () => apiFetch<CourseDetail>(`/courses/by-id/${encodeURIComponent(id)}`),
  });

export const adminGroupsQuery = (courseId?: string) =>
  queryOptions({
    queryKey: ['admin', 'groups', courseId ?? 'all'],
    queryFn: () => apiFetch<AdminGroup[]>('/admin/groups', { query: { courseId } }),
  });

export const adminGroupQuery = (id: string) =>
  queryOptions({
    queryKey: ['admin', 'groups', 'by-id', id],
    queryFn: () => apiFetch<AdminGroup>(`/admin/groups/${encodeURIComponent(id)}`),
  });

export const groupStudentsQuery = (id: string) =>
  queryOptions({
    queryKey: ['groups', id, 'students'],
    queryFn: () => apiFetch<GroupStudent[]>(`/groups/${encodeURIComponent(id)}/students`),
  });

export interface PaymentsQueryParams {
  provider?: PaymentMethod;
  status?: PaymentStatus;
  groupId?: string;
  page: number;
  pageSize: number;
}

export const adminPaymentsQuery = (params: PaymentsQueryParams) =>
  queryOptions({
    queryKey: ['admin', 'payments', params],
    queryFn: () => apiFetch<Paginated<AdminPayment>>('/payments', { query: { ...params } }),
    placeholderData: keepPreviousData,
  });

export interface EmailsQueryParams {
  type?: EmailType;
  page: number;
  pageSize: number;
}

export const adminEmailsQuery = (params: EmailsQueryParams) =>
  queryOptions({
    queryKey: ['admin', 'emails', params],
    queryFn: () => apiFetch<Paginated<EmailLogEntry>>('/admin/emails', { query: { ...params } }),
    placeholderData: keepPreviousData,
  });

export const adminTestimonialsQuery = queryOptions({
  queryKey: ['testimonials', 'all'],
  queryFn: () => apiFetch<AdminTestimonial[]>('/testimonials', { query: { all: true } }),
});

export const siteSettingsQuery = queryOptions({
  queryKey: ['site-settings'],
  queryFn: () => apiFetch<SiteSettings>('/site-settings'),
});

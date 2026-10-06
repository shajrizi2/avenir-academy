import 'server-only';
import type {
  CourseDetail,
  CourseSummary,
  Locale,
  PublicInstructor,
  PublicTestimonial,
  SiteSettings,
} from '@ai-academy/shared';
import { unstable_rethrow } from 'next/navigation';
import { cache } from 'react';
import { serverGet } from './server-api';

/**
 * Landing-page data. Every loader is deduplicated per request (React `cache`) and fails
 * soft: the marketing page must still render (and convert) if the API is unavailable.
 */

async function safe<T>(load: () => Promise<T>, fallback: T, what: string): Promise<T> {
  try {
    return await load();
  } catch (error) {
    // Let Next.js's own control-flow errors through (e.g. the prerender ending while this
    // request-time fetch is pending); only swallow real API failures.
    unstable_rethrow(error);
    console.error(`[landing] could not load ${what}:`, error);
    return fallback;
  }
}

export const getSiteSettings = cache((): Promise<SiteSettings | null> =>
  safe(() => serverGet<SiteSettings>('/site-settings'), null, 'site settings'),
);

/** Published courses with their modules, or null if the API failed. */
export const getTracks = cache((): Promise<CourseDetail[] | null> =>
  safe(
    async () => {
      const courses = await serverGet<CourseSummary[]>('/courses');
      return Promise.all(
        courses.map((c) => serverGet<CourseDetail>(`/courses/${encodeURIComponent(c.slug)}`)),
      );
    },
    null,
    'tracks',
  ),
);

export const getInstructors = cache((): Promise<PublicInstructor[]> =>
  safe(() => serverGet<PublicInstructor[]>('/instructors'), [], 'instructors'),
);

export const getTestimonials = cache((locale: Locale): Promise<PublicTestimonial[]> =>
  safe(() => serverGet<PublicTestimonial[]>(`/testimonials?locale=${locale}`), [], 'testimonials'),
);

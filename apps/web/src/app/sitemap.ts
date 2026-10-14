import type { CourseSummary } from '@ai-academy/shared';
import type { MetadataRoute } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { connection } from 'next/server';
import { serverGet } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';

/** Generated per request so newly published courses appear without a deploy. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  let courses: CourseSummary[] = [];
  try {
    courses = await serverGet<CourseSummary[]>('/courses');
  } catch (error) {
    unstable_rethrow(error);
    // The API being down must not break the sitemap; list the static pages only.
  }

  return [
    { url: `${SITE_URL}/sq`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/courses`, changeFrequency: 'weekly', priority: 0.8 },
    ...courses.map((course) => ({
      url: `${SITE_URL}/courses/${course.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/register`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}

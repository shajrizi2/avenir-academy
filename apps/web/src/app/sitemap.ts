import { type CourseSummary, JOB_CATEGORY_SLUGS } from '@ai-academy/shared';
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
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    ...Object.values(JOB_CATEGORY_SLUGS).map((slug) => ({
      url: `${SITE_URL}/?kategoria=${slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/training`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/training/courses`, changeFrequency: 'weekly', priority: 0.8 },
    ...courses.map((course) => ({
      url: `${SITE_URL}/training/courses/${course.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/training/register`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/training/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/for-companies`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privatesia`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}

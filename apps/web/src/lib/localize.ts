import type { CourseDetail, Locale } from '@ai-academy/shared';

/**
 * A course in the landing page's language. Albanian fields are optional translations
 * (PLAN D11); anything not translated falls back to the English text.
 */
export function localizeCourse(course: CourseDetail, locale: Locale): CourseDetail {
  if (locale !== 'sq') return course;
  return {
    ...course,
    title: course.titleSq ?? course.title,
    summary: course.summarySq ?? course.summary,
    description: course.descriptionSq ?? course.description,
    modules: course.modules.map((m) => ({
      ...m,
      title: m.titleSq ?? m.title,
      description: m.descriptionSq ?? m.description,
    })),
  };
}

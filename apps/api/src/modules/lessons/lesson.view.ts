import type { Prisma } from '../../generated/prisma/client.js';

export const lessonSummarySelect = {
  id: true,
  moduleId: true,
  order: true,
  title: true,
  estimatedMin: true,
  videoUrl: true,
} as const satisfies Prisma.LessonSelect;

type LessonSummaryRow = Prisma.LessonGetPayload<{ select: typeof lessonSummarySelect }>;

export interface LessonSummaryRecord {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  estimatedMin: number | null;
  hasVideo: boolean;
  /** For the current student; null for staff. */
  completedAt: Date | null;
}

export function toLessonSummary(
  row: LessonSummaryRow,
  completedAt: Date | null,
): LessonSummaryRecord {
  return {
    id: row.id,
    moduleId: row.moduleId,
    order: row.order,
    title: row.title,
    estimatedMin: row.estimatedMin,
    hasVideo: row.videoUrl !== null,
    completedAt,
  };
}

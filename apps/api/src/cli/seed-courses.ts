/**
 * Production content seed: the three courses with their modules and one group per course
 * starting on 1 November 2026 (Mon/Wed/Fri 19:00–21:00, 10 seats). No students, no
 * testimonials, no instructors. Safe to run again: existing courses and groups are kept
 * (titles and prices are refreshed from prisma/catalog.ts; groups are not touched).
 *
 *   node dist/src/cli/seed-courses.js
 *   On the server: deploy/scripts/compose.sh run --rm --no-deps api node dist/src/cli/seed-courses.js
 *
 * Afterwards set the Google Meet links, instructors and descriptions in the admin.
 */
import 'dotenv/config';
import { generateSessionTimes, SESSIONS_PER_MODULE } from '@ai-academy/shared';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CATALOG,
  CURRENCY,
  FIRST_GROUP_START,
  FIRST_GROUP_START_TIME,
  FIRST_GROUP_WEEKDAYS,
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  STARTER_LESSONS,
} from '../../prisma/catalog.js';
import { PrismaClient } from '../generated/prisma/client.js';

const GROUP_NAME = 'Grupi 1 – Nëntor 2026';
/** Replaced by the real link in the admin (groups and sessions). */
const PLACEHOLDER_MEET = 'https://meet.google.com/xxx-xxxx-xxx';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    for (const entry of CATALOG) {
      const { modules, ...courseData } = entry;
      const data = {
        ...courseData,
        titleSq: courseData.title,
        summarySq: courseData.summary,
        descriptionSq: courseData.description,
        startDate: new Date(`${FIRST_GROUP_START}T00:00:00Z`),
        priceCents: PRICE_CENTS,
        listPriceCents: LIST_PRICE_CENTS,
        currency: CURRENCY,
      };
      const course = await prisma.course.upsert({
        where: { slug: entry.slug },
        update: { ...data },
        create: { ...data, isPublished: true },
      });
      const moduleIds: string[] = [];
      for (const [i, module] of modules.entries()) {
        const row = await prisma.module.upsert({
          where: { courseId_order: { courseId: course.id, order: i + 1 } },
          update: {},
          create: {
            ...module,
            titleSq: module.title,
            descriptionSq: module.description,
            order: i + 1,
            courseId: course.id,
          },
        });
        moduleIds.push(row.id);
      }
      for (const [i, lesson] of (STARTER_LESSONS[entry.slug] ?? []).entries()) {
        await prisma.lesson.upsert({
          where: { moduleId_order: { moduleId: moduleIds[0], order: i + 1 } },
          update: {},
          create: { moduleId: moduleIds[0], order: i + 1, ...lesson },
        });
      }

      const existing = await prisma.group.findFirst({
        where: { courseId: course.id, name: GROUP_NAME },
      });
      if (existing) {
        console.log(`${course.title}: group "${GROUP_NAME}" exists, left as is.`);
        continue;
      }
      const times = generateSessionTimes(
        {
          startDate: FIRST_GROUP_START,
          weekdays: FIRST_GROUP_WEEKDAYS,
          startTime: FIRST_GROUP_START_TIME,
          timezone: 'Europe/Tirane',
        },
        moduleIds.length * SESSIONS_PER_MODULE,
      );
      const last = times.at(-1) ?? new Date(`${FIRST_GROUP_START}T00:00:00Z`);
      const group = await prisma.group.create({
        data: {
          courseId: course.id,
          name: GROUP_NAME,
          startDate: new Date(`${FIRST_GROUP_START}T00:00:00Z`),
          endDate: new Date(`${last.toISOString().slice(0, 10)}T00:00:00Z`),
          weekdays: FIRST_GROUP_WEEKDAYS,
          startTime: FIRST_GROUP_START_TIME,
          durationMin: 120,
          capacity: 10,
          meetUrl: PLACEHOLDER_MEET,
        },
      });
      await prisma.liveSession.createMany({
        data: times.map((startsAt, i) => ({
          groupId: group.id,
          moduleId: moduleIds[Math.floor(i / SESSIONS_PER_MODULE)],
          title: `Leksioni ${(i % SESSIONS_PER_MODULE) + 1}`,
          startsAt,
          durationMin: 120,
          meetUrl: PLACEHOLDER_MEET,
        })),
      });
      console.log(`${course.title}: created "${GROUP_NAME}" with ${times.length} lectures.`);
    }
    console.log('Done. Next: set the Google Meet links and instructors in /admin/groups.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

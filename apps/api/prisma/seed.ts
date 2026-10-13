/**
 * Idempotent development seed: running it twice leaves the same data.
 * Creates 1 admin, 1 instructor, 2 students, the three courses with 4 modules each, one
 * group per course starting 1 November 2026 (12 lectures per module), starter offline
 * lessons, one paid student, one bank transfer waiting for confirmation, and a sample test.
 */
import 'dotenv/config';
import { generateSessionTimes, SESSIONS_PER_MODULE } from '@ai-academy/shared';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  EnrollmentStatus,
  ModuleStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  QuestionType,
  Role,
} from '../src/generated/prisma/client.js';
import {
  CATALOG,
  CURRENCY,
  FIRST_GROUP_START,
  FIRST_GROUP_START_TIME,
  FIRST_GROUP_WEEKDAYS,
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  STARTER_LESSONS,
} from './catalog.js';

const SEED_PASSWORD = 'Password123!';
const DAY = 24 * 60 * 60 * 1000;
const MEET_URL = 'https://meet.google.com/abc-defg-hij';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Midnight UTC `days` from today, so seeded dates are stable within a day. */
function daysFromToday(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + days * DAY);
}

async function upsertUser(
  email: string,
  firstName: string,
  lastName: string,
  role: Role,
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, role },
    create: { email, firstName, lastName, role, passwordHash },
  });
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await upsertUser('admin@aiacademy.dev', 'Ada', 'Admin', Role.ADMIN, passwordHash);
  const instructor = await upsertUser(
    'instructor@aiacademy.dev',
    'Ian',
    'Instructor',
    Role.INSTRUCTOR,
    passwordHash,
  );
  const student1 = await upsertUser(
    'student1@aiacademy.dev',
    'Sara',
    'Student',
    Role.STUDENT,
    passwordHash,
  );
  const student2 = await upsertUser(
    'student2@aiacademy.dev',
    'Sam',
    'Student',
    Role.STUDENT,
    passwordHash,
  );

  // The three courses, their modules and one group each (a test group starts today, so the
  // lectures and the join window can be tried right away).
  const groupsByCourse = new Map<string, string>();
  const courses = [];
  for (const [index, entry] of CATALOG.entries()) {
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
      isPublished: true,
    };
    const course = await prisma.course.upsert({
      where: { slug: entry.slug },
      update: data,
      create: data,
    });
    const moduleIds: string[] = [];
    for (const [i, module] of modules.entries()) {
      const order = i + 1;
      const row = await prisma.module.upsert({
        where: { courseId_order: { courseId: course.id, order } },
        update: {
          ...module,
          titleSq: module.title,
          descriptionSq: module.description,
          instructorId: instructor.id,
        },
        create: {
          ...module,
          titleSq: module.title,
          descriptionSq: module.description,
          order,
          courseId: course.id,
          instructorId: instructor.id,
        },
      });
      moduleIds.push(row.id);
    }

    const groupName = `Grupi 1 – Nëntor 2026`;
    let group = await prisma.group.findFirst({ where: { courseId: course.id, name: groupName } });
    if (!group) {
      group = await prisma.group.create({
        data: {
          courseId: course.id,
          name: groupName,
          startDate: new Date(`${FIRST_GROUP_START}T00:00:00Z`),
          endDate: new Date(`${FIRST_GROUP_START}T00:00:00Z`),
          weekdays: FIRST_GROUP_WEEKDAYS,
          startTime: FIRST_GROUP_START_TIME,
          durationMin: 120,
          capacity: 10,
          instructorId: instructor.id,
          meetUrl: MEET_URL,
        },
      });
      const times = generateSessionTimes(
        {
          startDate: FIRST_GROUP_START,
          weekdays: FIRST_GROUP_WEEKDAYS,
          startTime: FIRST_GROUP_START_TIME,
          timezone: 'Europe/Tirane',
        },
        moduleIds.length * SESSIONS_PER_MODULE,
      );
      await prisma.liveSession.createMany({
        data: times.map((startsAt, i) => ({
          groupId: group!.id,
          moduleId: moduleIds[Math.floor(i / SESSIONS_PER_MODULE)],
          title: `Leksioni ${(i % SESSIONS_PER_MODULE) + 1}`,
          startsAt,
          durationMin: 120,
          meetUrl: MEET_URL,
        })),
      });
      const last = times.at(-1);
      if (last) {
        await prisma.group.update({
          where: { id: group.id },
          data: { endDate: new Date(last.toISOString().slice(0, 10) + 'T00:00:00Z') },
        });
      }
    }
    groupsByCourse.set(course.id, group.id);

    // Starter offline lessons on module 1.
    for (const [i, lesson] of (STARTER_LESSONS[entry.slug] ?? []).entries()) {
      await prisma.lesson.upsert({
        where: { moduleId_order: { moduleId: moduleIds[0], order: i + 1 } },
        update: { title: lesson.title, content: lesson.content, estimatedMin: lesson.estimatedMin },
        create: {
          moduleId: moduleIds[0],
          order: i + 1,
          title: lesson.title,
          content: lesson.content,
          estimatedMin: lesson.estimatedMin,
        },
      });
    }
    courses.push({ ...course, moduleIds, index });
  }
  const [vibe, marketing] = courses;
  const vibeGroupId = groupsByCourse.get(vibe.id)!;
  const marketingGroupId = groupsByCourse.get(marketing.id)!;

  // student1: enrolled in Vibe Coding, first month paid (confirmed bank transfer).
  const enrollment1 = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student1.id, courseId: vibe.id } },
    update: {},
    create: {
      userId: student1.id,
      courseId: vibe.id,
      groupId: vibeGroupId,
      status: EnrollmentStatus.APPROVED,
      decidedAt: daysFromToday(-8),
    },
  });
  for (const [i, moduleId] of vibe.moduleIds.entries()) {
    const active = i === 0;
    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId: student1.id, moduleId } },
      update: {},
      create: {
        userId: student1.id,
        moduleId,
        status: active ? ModuleStatus.ACTIVE : ModuleStatus.LOCKED,
        unlockedAt: active ? daysFromToday(-7) : null,
      },
    });
  }
  await prisma.payment.upsert({
    where: { reference: 'AV-SEED0001' },
    update: {},
    create: {
      enrollmentId: enrollment1.id,
      moduleId: vibe.moduleIds[0],
      amountCents: PRICE_CENTS,
      currency: CURRENCY,
      provider: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.CONFIRMED,
      reference: 'AV-SEED0001',
      confirmedAt: daysFromToday(-8),
      confirmedById: admin.id,
      note: 'Seed: paguar me para në dorë',
    },
  });

  // student2: a seat held in Digital Marketing, bank transfer waiting for the admin.
  const hold = new Date(Date.now() + 40 * 60 * 60 * 1000);
  const enrollment2 = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: marketing.id } },
    update: {},
    create: {
      userId: student2.id,
      courseId: marketing.id,
      groupId: marketingGroupId,
      status: EnrollmentStatus.PENDING_PAYMENT,
      holdExpiresAt: hold,
    },
  });
  await prisma.payment.upsert({
    where: { reference: 'AV-SEED0002' },
    update: {},
    create: {
      enrollmentId: enrollment2.id,
      moduleId: marketing.moduleIds[0],
      amountCents: PRICE_CENTS,
      currency: CURRENCY,
      provider: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.PENDING,
      reference: 'AV-SEED0002',
      holdExpiresAt: hold,
    },
  });

  // A sample test on Vibe Coding module 1, open from a week ago for the next month, so the
  // whole attempt flow can be tried locally.
  const firstModule = vibe.moduleIds[0];
  const existingTest = await prisma.test.findUnique({ where: { moduleId: firstModule } });
  if (!existingTest) {
    await prisma.test.create({
      data: {
        moduleId: firstModule,
        title: 'Bazat e kodimit me AI: testi i modulit',
        opensAt: daysFromToday(-7),
        closesAt: daysFromToday(30),
        isPublished: true,
        questions: {
          create: [
            {
              order: 1,
              type: QuestionType.SINGLE_CHOICE,
              text: 'Çfarë bën në thelb një model i madh gjuhësor?',
              options: {
                create: [
                  { text: 'Parashikon fjalën tjetër sipas kontekstit', isCorrect: true },
                  { text: 'Kërkon përgjigjet në një bazë të dhënash fikse' },
                  { text: 'Ekzekuton kod për të gjetur përgjigjen' },
                  { text: 'Kopjon tekst nga interneti në kohë reale' },
                ],
              },
            },
            {
              order: 2,
              type: QuestionType.MULTI_CHOICE,
              text: 'Cilat e bëjnë një prompt më efektiv? (Zgjidh të gjitha që vlejnë)',
              options: {
                create: [
                  { text: 'Konteksti i qartë dhe qëllimi', isCorrect: true },
                  { text: 'Një shembull i rezultatit të dëshiruar', isCorrect: true },
                  { text: 'Sa më i paqartë të jetë' },
                  { text: 'Formati i përgjigjes', isCorrect: true },
                ],
              },
            },
            {
              order: 3,
              type: QuestionType.TRUE_FALSE,
              text: 'Përgjigjet e AI-së janë gjithmonë të sakta.',
              options: { create: [{ text: 'E vërtetë' }, { text: 'E gabuar', isCorrect: true }] },
            },
          ],
        },
      },
    });
  }

  // Site settings. Every value is a PLACEHOLDER for the team to replace in the admin.
  // `update: {}` keeps edits on re-seed.
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nextCohortStart: new Date(`${FIRST_GROUP_START}T00:00:00Z`),
      scheduleSq: '3 herë në javë nga 2 orë, 19:00–21:00',
      scheduleEn: '3 times a week for 2 hours, 19:00–21:00',
      seatsTotal: 10,
      priceAmount: 89,
      priceNoteSq: 'në muaj',
      priceNoteEn: 'a month',
      contactEmail: 'info@example.com',
      contactPhone: '+383 44 000 000',
      whatsappNumber: '38344000000',
      bankBeneficiary: 'Avenir Academy (VENDOS PËRFITUESIN)',
      bankIban: 'XK051212012345678906',
      bankName: 'VENDOS EMRIN E BANKËS',
    },
  });
  // Testimonials are intentionally NOT seeded: only real quotes may appear on the site.

  console.log('Seed complete.');
  console.table([
    { role: 'ADMIN', email: admin.email },
    { role: 'INSTRUCTOR', email: instructor.email },
    { role: 'STUDENT', email: student1.email },
    { role: 'STUDENT', email: student2.email },
  ]);
  console.log(`All seed accounts use the password: ${SEED_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

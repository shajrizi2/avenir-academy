/**
 * Idempotent development seed: running it twice leaves the same data.
 * Creates 1 admin, 1 instructor, 2 students, both tracks with 4 modules each,
 * one sample live session and one sample test.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  EnrollmentStatus,
  ModuleStatus,
  PrismaClient,
  QuestionType,
  Role,
} from '../src/generated/prisma/client.js';

const SEED_PASSWORD = 'Password123!';
const DAY = 24 * 60 * 60 * 1000;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Midnight UTC `days` from today, so seeded dates are stable within a day. */
function daysFromToday(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + days * DAY);
}

const tracks = [
  {
    slug: 'ai-foundations',
    title: 'AI Foundations',
    titleSq: 'Themelet e AI-së',
    summarySq:
      'Nga prompti i parë deri te puna e përditshme me AI: një program live katërmujor për profesionistë.',
    descriptionSq:
      'Një program praktik dhe live në katër module mujore. Fillon me mënyrën si funksionon AI-ja e sotme dhe si ta përdorësh me siguri, e lidh AI-në me mjetet që i përdor tashmë, mëson të ndërtosh me asistentë kodimi dhe përfundon duke i ridizajnuar proceset e punës në profesionin tënd. Çdo modul mbyllet me një test online; kur e kalon, hapet moduli tjetër.',
    summary:
      'From your first prompt to shipping AI-powered work: a four-month live programme for professionals.',
    description:
      'A practical, live programme in four monthly modules. You start with how modern AI works and how to use it safely, connect AI to the tools you already use, learn to build with AI coding assistants, and finish by redesigning workflows in your own profession. Every module ends with an online test; passing it unlocks the next one.',
    startDate: daysFromToday(-7),
    modules: [
      {
        title: 'AI Basics',
        titleSq: 'Bazat e AI-së',
        descriptionSq:
          'Si funksionojnë modelet e mëdha gjuhësore, ku janë të forta e ku jo, bazat e shkrimit të prompteve dhe përdorimi i përgjegjshëm.',
        description:
          'How large language models work, what they are good and bad at, prompting fundamentals, and responsible use.',
      },
      {
        title: 'AI Integration',
        titleSq: 'Integrimi i AI-së',
        descriptionSq:
          'Lidhja e AI-së me mjetet e përditshme: tabela, dokumente, email, automatizime dhe platforma pa kod.',
        description:
          'Connecting AI to everyday tools: spreadsheets, documents, email, automations and no-code platforms.',
      },
      {
        title: 'AI Coding',
        titleSq: 'Kodimi me AI',
        descriptionSq:
          'Ndërtimi i aplikacioneve dhe skripteve të vogla me asistentë kodimi, nga ideja te një prototip që funksionon.',
        description:
          'Building small apps and scripts with AI coding assistants, from idea to working prototype.',
      },
      {
        title: 'AI in Your Profession',
        titleSq: 'AI në profesionin tënd',
        descriptionSq:
          'Moduli përmbyllës: gjen rastet me vlerë të lartë në fushën tënde dhe ndërton një proces pune me AI që e përsërit lehtë.',
        description:
          'A capstone module: identify high-value use cases in your field and build a repeatable AI workflow.',
      },
    ],
  },
  {
    slug: 'digital-marketing',
    title: 'Digital Marketing',
    titleSq: 'Marketingu Digjital',
    summarySq:
      'Planifiko, krijo dhe mat fushata që japin rezultat, me AI-në si bashkëpilot marketingu në modulin e fundit.',
    descriptionSq:
      'Një program live dhe praktik që mbulon gjithë rrugëtimin e marketingut. Mëson bazat e pozicionimit dhe të audiencave, krijon përmbajtje për rrjetet sociale, drejton dhe mat fushata me pagesë dhe përfundon duke e vënë AI-në në punë në gjithë marketingun tënd. Çdo modul mujor mbyllet me një test online.',
    summary:
      'Plan, create and measure campaigns that work, with AI as your marketing co-pilot in the final module.',
    description:
      'A live, hands-on track covering the full marketing funnel. Learn the fundamentals of positioning and audiences, create content for social channels, run and measure paid campaigns, and finish by putting AI to work across your marketing. Each monthly module ends with an online test.',
    startDate: daysFromToday(21),
    modules: [
      {
        title: 'Marketing Fundamentals',
        titleSq: 'Bazat e marketingut',
        descriptionSq:
          'Pozicionimi, audiencat, rrugëtimi i klientit dhe vendosja e qëllimeve që mund t’i matësh vërtet.',
        description:
          'Positioning, audiences, the customer journey and setting goals you can actually measure.',
      },
      {
        title: 'Social and Content',
        titleSq: 'Rrjetet sociale dhe përmbajtja',
        descriptionSq:
          'Strategjia e përmbajtjes, kanalet sociale, formatet e tregimit dhe ndërtimi i një kalendari përmbajtjeje.',
        description:
          'Content strategy, social media channels, storytelling formats and building a content calendar.',
      },
      {
        title: 'Ads and Analytics',
        titleSq: 'Reklamat dhe analitika',
        descriptionSq:
          'Fushata reklamash në kërkim dhe në rrjete sociale, matja e konvertimeve dhe leximi i paneleve analitike.',
        description:
          'Running search and social ad campaigns, tracking conversions and reading analytics dashboards.',
      },
      {
        title: 'AI for Marketing',
        titleSq: 'AI për marketing',
        descriptionSq:
          'Përdorimi i AI-së për kërkime, shkrim tekstesh, prodhim kreativ, personalizim dhe raportim.',
        description:
          'Using AI for research, copywriting, creative production, personalisation and reporting.',
      },
    ],
  },
] as const;

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

  const courses = [];
  for (const track of tracks) {
    const { modules, ...courseData } = track;
    const course = await prisma.course.upsert({
      where: { slug: track.slug },
      update: { ...courseData, isPublished: true },
      create: { ...courseData, isPublished: true },
    });
    for (const [index, module] of modules.entries()) {
      const order = index + 1;
      await prisma.module.upsert({
        where: { courseId_order: { courseId: course.id, order } },
        update: { ...module, instructorId: instructor.id },
        create: { ...module, order, courseId: course.id, instructorId: instructor.id },
      });
    }
    courses.push(course);
  }
  const [aiCourse, marketingCourse] = courses;

  const aiModules = await prisma.module.findMany({
    where: { courseId: aiCourse.id },
    orderBy: { order: 'asc' },
  });
  const aiBasics = aiModules[0];

  // student1: approved in AI Foundations, so Module 1 is ACTIVE and the rest are LOCKED.
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student1.id, courseId: aiCourse.id } },
    update: {},
    create: {
      userId: student1.id,
      courseId: aiCourse.id,
      status: EnrollmentStatus.APPROVED,
      decidedAt: daysFromToday(-8),
    },
  });
  for (const module of aiModules) {
    const active = module.order === 1;
    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId: student1.id, moduleId: module.id } },
      update: {},
      create: {
        userId: student1.id,
        moduleId: module.id,
        status: active ? ModuleStatus.ACTIVE : ModuleStatus.LOCKED,
        unlockedAt: active ? daysFromToday(-7) : null,
      },
    });
  }

  // student2: pending request in Digital Marketing (shows up in the admin approval queue).
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student2.id, courseId: marketingCourse.id } },
    update: {},
    create: { userId: student2.id, courseId: marketingCourse.id, status: EnrollmentStatus.PENDING },
  });

  // One upcoming live session for AI Basics, two days from now at 17:00 UTC.
  const sessionTitle = 'Week 2: Prompting fundamentals';
  const existingSession = await prisma.liveSession.findFirst({
    where: { moduleId: aiBasics.id, title: sessionTitle },
  });
  if (!existingSession) {
    await prisma.liveSession.create({
      data: {
        moduleId: aiBasics.id,
        title: sessionTitle,
        startsAt: new Date(daysFromToday(2).getTime() + 17 * 60 * 60 * 1000),
        durationMin: 90,
        meetUrl: 'https://meet.google.com/abc-defg-hij',
      },
    });
  }

  // The AI Basics test. Its window is the last week of the 4-week module.
  const moduleStart = aiCourse.startDate ?? daysFromToday(0);
  const existingTest = await prisma.test.findUnique({ where: { moduleId: aiBasics.id } });
  if (!existingTest) {
    await prisma.test.create({
      data: {
        moduleId: aiBasics.id,
        title: 'AI Basics: Module Test',
        opensAt: new Date(moduleStart.getTime() + 21 * DAY),
        closesAt: new Date(moduleStart.getTime() + 28 * DAY),
        isPublished: true,
        questions: {
          create: [
            {
              order: 1,
              type: QuestionType.SINGLE_CHOICE,
              text: 'What does a large language model fundamentally do?',
              options: {
                create: [
                  { text: 'Predicts the next token based on context', isCorrect: true },
                  { text: 'Looks answers up in a fixed database' },
                  { text: 'Executes code to find the answer' },
                  { text: 'Copies text from the internet in real time' },
                ],
              },
            },
            {
              order: 2,
              type: QuestionType.MULTI_CHOICE,
              text: 'Which of these make a prompt more effective? (Select all that apply)',
              options: {
                create: [
                  { text: 'Giving clear context and a goal', isCorrect: true },
                  { text: 'Providing an example of the desired output', isCorrect: true },
                  { text: 'Keeping it as vague as possible' },
                  { text: 'Specifying the format of the answer', isCorrect: true },
                ],
              },
            },
            {
              order: 3,
              type: QuestionType.TRUE_FALSE,
              text: 'AI-generated output is always factually correct.',
              options: { create: [{ text: 'True' }, { text: 'False', isCorrect: true }] },
            },
          ],
        },
      },
    });
  }

  // Landing-page settings. Every value is a PLACEHOLDER for the team to replace (via
  // PATCH /api/v1/site-settings or Prisma Studio). `update: {}` keeps edits on re-seed.
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nextCohortStart: marketingCourse.startDate,
      scheduleSq: '2 mbrëmje në javë, 19:00–20:30',
      scheduleEn: '2 evenings a week, 19:00–20:30',
      seatsTotal: 20,
      priceAmount: null, // null renders "contact us for the price"
      contactEmail: 'info@example.com',
      contactPhone: '+383 44 000 000',
      whatsappNumber: '38344000000',
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

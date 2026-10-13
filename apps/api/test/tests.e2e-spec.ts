import type {
  AdminEnrollment,
  AdminStats,
  AttemptResult,
  AttemptSession,
  AuthResponse,
  CourseDetail,
  CourseProgress,
  LearnCourse,
  ModuleDetail,
  Paginated,
  QuestionInput,
  StaffTest,
  StudentTest,
  TestBuilderData,
  TestResults,
} from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { Role } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { APP_OPTIONS, setupApp } from '../src/setup-app.js';

const PASSWORD = 'Password123';
const HOUR = 60 * 60_000;

const QUESTIONS: QuestionInput[] = [
  {
    type: 'SINGLE_CHOICE',
    text: 'What does a language model predict?',
    options: [
      { text: 'The next token', isCorrect: true },
      { text: 'The weather', isCorrect: false },
    ],
  },
  {
    type: 'MULTI_CHOICE',
    text: 'Which make a prompt better?',
    points: 2,
    options: [
      { text: 'Context', isCorrect: true },
      { text: 'An example', isCorrect: true },
      { text: 'Vagueness', isCorrect: false },
    ],
  },
  {
    type: 'TRUE_FALSE',
    text: 'AI output is always correct.',
    options: [
      { text: 'True', isCorrect: false },
      { text: 'False', isCorrect: true },
    ],
  },
];

/** Test builder → attempts → grading → progression → results and overrides (Sprint 3). */
describe('Tests and progression (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const run = Date.now();
  const token = {
    admin: '',
    instructor: '',
    otherInstructor: '',
    student: '',
    classmate: '',
    outsider: '',
  };
  let instructorId = '';
  let studentId = '';
  let course: CourseDetail;
  let module1 = '';
  let module2 = '';
  let test: StaffTest;

  const http = () => request(app.getHttpServer());
  const as = (who: keyof typeof token) => ({ Authorization: `Bearer ${token[who]}` });

  async function createUser(name: string, role: Role) {
    const email = `${name}-${run}@example.com`;
    const registered = await http()
      .post('/api/v1/auth/register')
      .send({ email, password: PASSWORD, firstName: name, lastName: 'Tester' })
      .expect(201);
    const { id } = (registered.body as AuthResponse).user;
    if (role !== Role.STUDENT) await prisma.user.update({ where: { id }, data: { role } });
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return { id, accessToken: (login.body as AuthResponse).accessToken };
  }

  async function enrollAndApprove(who: 'student' | 'classmate') {
    await http().post(`/api/v1/courses/${course.id}/enroll`).set(as(who)).expect(201);
    const queue = (
      await http()
        .get(`/api/v1/enrollments?status=PENDING&courseId=${course.id}`)
        .set(as('admin'))
        .expect(200)
    ).body as Paginated<AdminEnrollment>;
    for (const enrollment of queue.items) {
      await http()
        .patch(`/api/v1/enrollments/${enrollment.id}`)
        .set(as('admin'))
        .send({ status: 'APPROVED' })
        .expect(200);
    }
  }

  /** Answers every question correctly, or every question wrongly. */
  function answersFor(session: AttemptSession, correct: boolean): Record<string, string[]> {
    const answers: Record<string, string[]> = {};
    for (const question of session.questions) {
      const source = QUESTIONS[question.order - 1];
      answers[question.id] = question.options
        .filter((_, i) => source.options[i].isCorrect === correct)
        .map((o) => o.id)
        .slice(0, question.type === 'MULTI_CHOICE' ? undefined : 1);
    }
    return answers;
  }

  const overview = async (who: 'student' | 'classmate' = 'student') =>
    (await http().get(`/api/v1/tests/${test.id}`).set(as(who)).expect(200)).body as StudentTest;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication(APP_OPTIONS);
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    token.admin = (await createUser('admin', Role.ADMIN)).accessToken;
    const instructor = await createUser('instructor', Role.INSTRUCTOR);
    instructorId = instructor.id;
    token.instructor = instructor.accessToken;
    token.otherInstructor = (await createUser('other', Role.INSTRUCTOR)).accessToken;
    const student = await createUser('student', Role.STUDENT);
    studentId = student.id;
    token.student = student.accessToken;
    token.classmate = (await createUser('classmate', Role.STUDENT)).accessToken;
    token.outsider = (await createUser('outsider', Role.STUDENT)).accessToken;

    course = (
      await http()
        .post('/api/v1/courses')
        .set(as('admin'))
        .send({
          slug: `tests-${run}`,
          title: 'Tests flow',
          summary: 'A course created by the tests e2e suite.',
          description: 'Covers tests, attempts, grading and progression end to end.',
          isPublished: true,
        })
        .expect(201)
    ).body as CourseDetail;
    for (const title of ['Module one', 'Module two']) {
      const res = await http()
        .post(`/api/v1/courses/${course.id}/modules`)
        .set(as('admin'))
        .send({ title, description: `${title} of the tests course.`, instructorId })
        .expect(201);
      if (title === 'Module one') module1 = (res.body as { id: string }).id;
      else module2 = (res.body as { id: string }).id;
    }
    await enrollAndApprove('student');
    await enrollAndApprove('classmate');
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets the module’s instructor create a test, with the module’s last week as the default window', async () => {
    const empty = (
      await http().get(`/api/v1/modules/${module1}/test`).set(as('instructor')).expect(200)
    ).body as TestBuilderData;
    expect(empty.test).toBeNull();
    const { opensAt, closesAt } = empty.defaultWindow;
    expect(new Date(closesAt).getTime() - new Date(opensAt).getTime()).toBe(7 * 24 * HOUR);

    await http().get(`/api/v1/modules/${module1}/test`).set(as('otherInstructor')).expect(403);
    await http().get(`/api/v1/modules/${module1}/test`).set(as('student')).expect(403);
    await http()
      .post(`/api/v1/modules/${module1}/test`)
      .set(as('instructor'))
      .send({
        title: 'Backwards',
        opensAt: new Date(Date.now() + HOUR).toISOString(),
        closesAt: new Date().toISOString(),
      })
      .expect(400);

    test = (
      await http()
        .post(`/api/v1/modules/${module1}/test`)
        .set(as('instructor'))
        .send({
          title: 'Module one test',
          opensAt: new Date(Date.now() - HOUR).toISOString(),
          closesAt: new Date(Date.now() + 24 * HOUR).toISOString(),
        })
        .expect(201)
    ).body as StaffTest;
    expect(test).toMatchObject({
      passMark: 70,
      timeLimitMin: 45,
      maxAttempts: 2,
      isPublished: false,
    });
    await http()
      .post(`/api/v1/modules/${module1}/test`)
      .set(as('instructor'))
      .send({ title: 'Second test' })
      .expect(409);
  });

  it('validates questions and only publishes a test that has some', async () => {
    await http()
      .patch(`/api/v1/tests/${test.id}/publish`)
      .set(as('instructor'))
      .send({ isPublished: true })
      .expect(409);

    const twoCorrect = {
      ...QUESTIONS[0],
      options: QUESTIONS[0].options.map((o) => ({ ...o, isCorrect: true })),
    };
    const invalid = await http()
      .put(`/api/v1/tests/${test.id}/questions`)
      .set(as('instructor'))
      .send({ questions: [twoCorrect] })
      .expect(400);
    expect(JSON.stringify(invalid.body)).toContain('Question 1');

    test = (
      await http()
        .put(`/api/v1/tests/${test.id}/questions`)
        .set(as('instructor'))
        .send({ questions: QUESTIONS })
        .expect(200)
    ).body as StaffTest;
    expect(test.questions.map((q) => q.type)).toEqual([
      'SINGLE_CHOICE',
      'MULTI_CHOICE',
      'TRUE_FALSE',
    ]);
    expect(test.questions[0].options.map((o) => o.text)).toEqual(['The next token', 'The weather']);

    // Students can't see a draft test.
    const draft = (await http().get(`/api/v1/modules/${module1}`).set(as('student')).expect(200))
      .body as ModuleDetail;
    expect(draft.test).toBeNull();
    await http().get(`/api/v1/tests/${test.id}`).set(as('student')).expect(404);

    await http()
      .patch(`/api/v1/tests/${test.id}/publish`)
      .set(as('instructor'))
      .send({ isPublished: true })
      .expect(200);
    const published = (
      await http().get(`/api/v1/modules/${module1}`).set(as('student')).expect(200)
    ).body as ModuleDetail;
    expect(published.test).toMatchObject({ id: test.id, questionCount: 3 });
  });

  it('shows students the test without answers, and only to enrolled students', async () => {
    const view = await overview();
    expect(view).toMatchObject({
      status: 'ACTIVE',
      attemptsLeft: 2,
      questionCount: 3,
      totalPoints: 4,
      activeAttemptId: null,
    });
    await http().get(`/api/v1/tests/${test.id}`).set(as('outsider')).expect(403);
    await http().get(`/api/v1/tests/${test.id}`).set(as('instructor')).expect(403);

    const started = await http()
      .post(`/api/v1/tests/${test.id}/attempts`)
      .set(as('student'))
      .expect(200);
    expect(JSON.stringify(started.body)).not.toContain('isCorrect');
    const session = started.body as AttemptSession;
    expect(session.questions).toHaveLength(3);
    expect(new Date(session.deadline).getTime() - new Date(session.startedAt).getTime()).toBe(
      45 * 60_000,
    );

    // Starting again resumes the same attempt; someone else can't open it.
    const again = await http()
      .post(`/api/v1/tests/${test.id}/attempts`)
      .set(as('student'))
      .expect(200);
    expect((again.body as AttemptSession).id).toBe(session.id);
    expect(JSON.stringify(again.body)).not.toContain('isCorrect');
    await http().get(`/api/v1/attempts/${session.id}`).set(as('classmate')).expect(404);

    // Questions are frozen once someone has started.
    await http()
      .put(`/api/v1/tests/${test.id}/questions`)
      .set(as('instructor'))
      .send({ questions: QUESTIONS })
      .expect(409);
  });

  it('grades on the server and sets the module to FAILED when attempts run out', async () => {
    const view = await overview();
    const session = (
      await http().get(`/api/v1/attempts/${view.activeAttemptId}`).set(as('student')).expect(200)
    ).body as AttemptSession;

    await http()
      .patch(`/api/v1/attempts/${session.id}`)
      .set(as('student'))
      .send({ answers: { [session.questions[0].id]: ['not-an-option'] } })
      .expect(400);
    await http()
      .patch(`/api/v1/attempts/${session.id}`)
      .set(as('student'))
      .send({ answers: answersFor(session, false) })
      .expect(200);
    const resumed = (
      await http().get(`/api/v1/attempts/${session.id}`).set(as('student')).expect(200)
    ).body as AttemptSession;
    expect(resumed.answers).toEqual(answersFor(session, false));

    const first = (
      await http().post(`/api/v1/attempts/${session.id}/submit`).set(as('student')).expect(200)
    ).body as AttemptResult;
    expect(first).toMatchObject({
      attempt: { status: 'SUBMITTED', scorePct: 0, passed: false },
      moduleStatus: 'ACTIVE',
      attemptsLeft: 1,
      nextModule: null,
    });
    // Submitting twice returns the same result; saving afterwards is refused.
    const twice = (
      await http().post(`/api/v1/attempts/${session.id}/submit`).set(as('student')).expect(200)
    ).body as AttemptResult;
    expect(twice.attempt.submittedAt).toBe(first.attempt.submittedAt);
    await http()
      .patch(`/api/v1/attempts/${session.id}`)
      .set(as('student'))
      .send({ answers: {} })
      .expect(409);

    // Second attempt: one question right (1 of 4 points = 25%).
    const second = (
      await http().post(`/api/v1/tests/${test.id}/attempts`).set(as('student')).expect(200)
    ).body as AttemptSession;
    expect(second.id).not.toBe(session.id);
    const oneRight = answersFor(second, false);
    oneRight[second.questions[0].id] = answersFor(second, true)[second.questions[0].id];
    const failed = (
      await http()
        .post(`/api/v1/attempts/${second.id}/submit`)
        .set(as('student'))
        .send({ answers: oneRight })
        .expect(200)
    ).body as AttemptResult;
    expect(failed).toMatchObject({
      attempt: { scorePct: 25, passed: false },
      moduleStatus: 'FAILED',
      attemptsLeft: 0,
    });
    await http().post(`/api/v1/tests/${test.id}/attempts`).set(as('student')).expect(409);
  });

  it('shows results to staff and lets an admin give a failed student another try', async () => {
    const results = (
      await http().get(`/api/v1/tests/${test.id}/results`).set(as('instructor')).expect(200)
    ).body as TestResults;
    const row = results.rows.find((r) => r.user.id === studentId);
    expect(row).toMatchObject({
      status: 'FAILED',
      attemptsUsed: 2,
      attemptsLeft: 0,
      bestScore: 25,
    });
    expect(results.rows.find((r) => r.user.id !== studentId)).toMatchObject({
      status: 'ACTIVE',
      attemptsLeft: 2,
      lastAttempt: null,
    });
    await http().get(`/api/v1/tests/${test.id}/results`).set(as('otherInstructor')).expect(403);

    await http()
      .patch(`/api/v1/progress/${row?.progressId}`)
      .set(as('instructor'))
      .send({ status: 'ACTIVE' })
      .expect(403);
    await http()
      .patch(`/api/v1/progress/${row?.progressId}`)
      .set(as('admin'))
      .send({ status: 'LOCKED' })
      .expect(400);
    await http()
      .patch(`/api/v1/progress/${row?.progressId}`)
      .set(as('admin'))
      .send({ status: 'ACTIVE' })
      .expect(200);

    const view = await overview();
    expect(view).toMatchObject({ status: 'ACTIVE', attemptsLeft: 2 });
    expect(view.attempts).toHaveLength(2);
  });

  it('passes the module and unlocks the next one in the same step', async () => {
    const session = (
      await http().post(`/api/v1/tests/${test.id}/attempts`).set(as('student')).expect(200)
    ).body as AttemptSession;
    const result = (
      await http()
        .post(`/api/v1/attempts/${session.id}/submit`)
        .set(as('student'))
        .send({ answers: answersFor(session, true) })
        .expect(200)
    ).body as AttemptResult;
    expect(result).toMatchObject({
      attempt: { scorePct: 100, passed: true },
      moduleStatus: 'PASSED',
      nextModule: { id: module2, order: 2 },
    });
    expect((await overview()).nextModule).toMatchObject({ id: module2 });
    await http().post(`/api/v1/tests/${test.id}/attempts`).set(as('student')).expect(409);

    const learn = (
      await http().get(`/api/v1/me/courses/${course.slug}`).set(as('student')).expect(200)
    ).body as LearnCourse;
    expect(learn.modules.map((m) => m.status)).toEqual(['PASSED', 'ACTIVE']);
    await http().get(`/api/v1/modules/${module2}`).set(as('student')).expect(200);

    const progress = (await http().get('/api/v1/me/progress').set(as('student')).expect(200))
      .body as CourseProgress[];
    expect(progress.find((p) => p.course.id === course.id)).toMatchObject({
      totalModules: 2,
      passedModules: 1,
      current: { id: module2, status: 'ACTIVE', test: null },
    });
  });

  it('expires an abandoned attempt and grades the answers that were saved', async () => {
    const session = (
      await http().post(`/api/v1/tests/${test.id}/attempts`).set(as('classmate')).expect(200)
    ).body as AttemptSession;
    await http()
      .patch(`/api/v1/attempts/${session.id}`)
      .set(as('classmate'))
      .send({ answers: answersFor(session, true) })
      .expect(200);
    // Pretend the attempt started an hour ago (the limit is 45 minutes).
    await prisma.testAttempt.update({
      where: { id: session.id },
      data: { startedAt: new Date(Date.now() - HOUR) },
    });

    await http()
      .patch(`/api/v1/attempts/${session.id}`)
      .set(as('classmate'))
      .send({ answers: {} })
      .expect(409);
    const view = await overview('classmate');
    expect(view.attempts[0]).toMatchObject({ status: 'EXPIRED', scorePct: 100, passed: true });
    expect(view.status).toBe('PASSED');
  });

  it('keeps a test closed outside its window, and lets an admin pass a module by hand', async () => {
    const created = (
      await http()
        .post(`/api/v1/modules/${module2}/test`)
        .set(as('instructor'))
        .send({ title: 'Module two test' })
        .expect(201)
    ).body as StaffTest;
    await http()
      .put(`/api/v1/tests/${created.id}/questions`)
      .set(as('instructor'))
      .send({ questions: QUESTIONS })
      .expect(200);
    await http()
      .patch(`/api/v1/tests/${created.id}/publish`)
      .set(as('instructor'))
      .send({ isPublished: true })
      .expect(200);
    // The default window is the module's last week, which hasn't started yet.
    const closed = await http()
      .post(`/api/v1/tests/${created.id}/attempts`)
      .set(as('student'))
      .expect(409);
    expect(JSON.stringify(closed.body)).toContain('not open yet');

    const progress = (await http().get('/api/v1/me/progress').set(as('student')).expect(200))
      .body as CourseProgress[];
    expect(progress.find((p) => p.course.id === course.id)?.current?.test?.id).toBe(created.id);

    const row = await prisma.moduleProgress.findUniqueOrThrow({
      where: { userId_moduleId: { userId: studentId, moduleId: module2 } },
    });
    const passed = await http()
      .patch(`/api/v1/progress/${row.id}`)
      .set(as('admin'))
      .send({ status: 'PASSED' })
      .expect(200);
    expect(passed.body).toMatchObject({ status: 'PASSED' });
    await http()
      .patch(`/api/v1/progress/${row.id}`)
      .set(as('admin'))
      .send({ status: 'ACTIVE' })
      .expect(409);

    // A test nobody has taken can be deleted; one with attempts can't.
    await http().delete(`/api/v1/tests/${test.id}`).set(as('instructor')).expect(409);
    await http().delete(`/api/v1/tests/${created.id}`).set(as('instructor')).expect(204);
  });

  it('gives admins overview stats', async () => {
    const stats = (await http().get('/api/v1/admin/stats').set(as('admin')).expect(200))
      .body as AdminStats;
    expect(stats.students).toBeGreaterThanOrEqual(3);
    expect(stats.attemptsLast30Days).toBeGreaterThanOrEqual(4);
    expect(stats.passRateLast30Days).not.toBeNull();
    await http().get('/api/v1/admin/stats').set(as('instructor')).expect(403);
  });
});

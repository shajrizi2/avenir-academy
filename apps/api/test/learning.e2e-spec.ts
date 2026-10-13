import type {
  AdminEnrollment,
  AdminTestimonial,
  AuthResponse,
  CourseDetail,
  LearnCourse,
  LiveSessionSummary,
  MaterialSummary,
  ModuleDetail,
  Paginated,
  SessionAttendance,
  StaffSession,
  StudentSession,
  TeachingModule,
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
const MEET = 'https://meet.google.com/abc-defg-hij';
const MINUTE = 60_000;

/** Enrollment → approval → module access → sessions → attendance → materials (Sprint 2). */
describe('Learning flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const run = Date.now();
  const token: Record<'admin' | 'instructor' | 'student' | 'outsider', string> = {
    admin: '',
    instructor: '',
    student: '',
    outsider: '',
  };
  let instructorId = '';
  let studentId = '';
  let course: CourseDetail;
  let module1 = '';
  let module2 = '';

  const http = () => request(app.getHttpServer());
  const as = (who: keyof typeof token) => ({ Authorization: `Bearer ${token[who]}` });

  async function createUser(
    name: string,
    role: Role,
  ): Promise<{ id: string; accessToken: string }> {
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
    const student = await createUser('student', Role.STUDENT);
    studentId = student.id;
    token.student = student.accessToken;
    token.outsider = (await createUser('outsider', Role.STUDENT)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets an admin build a course with modules and assign an instructor', async () => {
    const created = await http()
      .post('/api/v1/courses')
      .set(as('admin'))
      .send({
        slug: `learning-${run}`,
        title: 'Learning flow',
        summary: 'A course created by the e2e test.',
        description: 'Covers enrollment, sessions and materials end to end.',
        isPublished: true,
      })
      .expect(201);
    course = created.body as CourseDetail;

    const first = await http()
      .post(`/api/v1/courses/${course.id}/modules`)
      .set(as('admin'))
      .send({ title: 'Module one', description: 'The first module of the course.', instructorId })
      .expect(201);
    module1 = (first.body as { id: string; order: number }).id;
    expect(first.body).toMatchObject({ order: 1, instructor: { id: instructorId } });

    const second = await http()
      .post(`/api/v1/courses/${course.id}/modules`)
      .set(as('admin'))
      .send({ title: 'Module two', description: 'The second module of the course.' })
      .expect(201);
    module2 = (second.body as { id: string }).id;
    expect(second.body).toMatchObject({ order: 2, instructor: null });

    // Only INSTRUCTOR users can be assigned, and only admins manage modules.
    await http()
      .patch(`/api/v1/modules/${module2}`)
      .set(as('admin'))
      .send({ instructorId: studentId })
      .expect(400);
    await http()
      .patch(`/api/v1/modules/${module2}`)
      .set(as('instructor'))
      .send({ title: 'Mine now' })
      .expect(403);

    const byId = await http()
      .get(`/api/v1/courses/by-id/${course.id}`)
      .set(as('admin'))
      .expect(200);
    expect((byId.body as CourseDetail).modules).toHaveLength(2);
  });

  it('stores Albanian translations, and clears one with an empty string', async () => {
    const updated = await http()
      .patch(`/api/v1/courses/${course.id}`)
      .set(as('admin'))
      .send({ titleSq: 'Rrjedha e mësimit', summarySq: 'Një kurs i krijuar nga testi e2e.' })
      .expect(200);
    expect(updated.body).toMatchObject({ titleSq: 'Rrjedha e mësimit', descriptionSq: null });
    const module = await http()
      .patch(`/api/v1/modules/${module1}`)
      .set(as('admin'))
      .send({ titleSq: 'Moduli një', descriptionSq: '' })
      .expect(200);
    expect(module.body).toMatchObject({ titleSq: 'Moduli një', descriptionSq: null });

    const cleared = await http()
      .patch(`/api/v1/courses/${course.id}`)
      .set(as('admin'))
      .send({ titleSq: '' })
      .expect(200);
    expect((cleared.body as CourseDetail).titleSq).toBeNull();
    await http()
      .patch(`/api/v1/courses/${course.id}`)
      .set(as('admin'))
      .send({ summarySq: 'short' })
      .expect(400);
  });

  it('keeps a module closed until the enrollment is approved', async () => {
    await http().post(`/api/v1/courses/${course.id}/enroll`).set(as('student')).expect(201);
    await http().get(`/api/v1/modules/${module1}`).set(as('student')).expect(403);
    await http().get(`/api/v1/me/courses/${course.slug}`).set(as('student')).expect(403);
  });

  it('approves an enrollment: module 1 ACTIVE, the rest LOCKED', async () => {
    const queue = await http()
      .get('/api/v1/enrollments')
      .query({ status: 'PENDING', courseId: course.id })
      .set(as('admin'))
      .expect(200);
    const pending = (queue.body as Paginated<AdminEnrollment>).items.find(
      (e) => e.user.id === studentId,
    );
    expect(pending).toBeDefined();
    expect(pending?.user).not.toHaveProperty('passwordHash');

    await http()
      .patch(`/api/v1/enrollments/${pending?.id}`)
      .set(as('student'))
      .send({ status: 'APPROVED' })
      .expect(403);
    const approved = await http()
      .patch(`/api/v1/enrollments/${pending?.id}`)
      .set(as('admin'))
      .send({ status: 'APPROVED', note: 'Paid in cash' })
      .expect(200);
    expect(approved.body).toMatchObject({ status: 'APPROVED', note: 'Paid in cash' });
    await http()
      .patch(`/api/v1/enrollments/${pending?.id}`)
      .set(as('admin'))
      .send({ status: 'REJECTED' })
      .expect(409);

    const learn = await http()
      .get(`/api/v1/me/courses/${course.slug}`)
      .set(as('student'))
      .expect(200);
    expect((learn.body as LearnCourse).modules.map((m) => m.status)).toEqual(['ACTIVE', 'LOCKED']);

    const detail = await http().get(`/api/v1/modules/${module1}`).set(as('student')).expect(200);
    expect(detail.body).toMatchObject({ status: 'ACTIVE', canManage: false });
    const locked = await http().get(`/api/v1/modules/${module2}`).set(as('student')).expect(403);
    expect(JSON.stringify(locked.body)).toContain('mbyllur');
    await http().get(`/api/v1/modules/${module1}`).set(as('outsider')).expect(403);
  });

  it('lets only the assigned instructor manage sessions, and hides the Meet link until 15 minutes before', async () => {
    const later = await http()
      .post(`/api/v1/modules/${module1}/sessions`)
      .set(as('instructor'))
      .send({
        title: 'Next week',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * MINUTE).toISOString(),
        meetUrl: MEET,
      })
      .expect(201);
    expect((later.body as LiveSessionSummary).durationMin).toBe(90);
    const live = await http()
      .post(`/api/v1/modules/${module1}/sessions`)
      .set(as('instructor'))
      .send({
        title: 'Starting now',
        startsAt: new Date(Date.now() + 10 * MINUTE).toISOString(),
        meetUrl: MEET,
      })
      .expect(201);

    await http()
      .post(`/api/v1/modules/${module1}/sessions`)
      .set(as('instructor'))
      .send({
        title: 'Zoom call',
        startsAt: new Date().toISOString(),
        meetUrl: 'https://zoom.us/j/123',
      })
      .expect(400);
    await http()
      .post(`/api/v1/modules/${module2}/sessions`)
      .set(as('instructor'))
      .send({ title: 'Not my module', startsAt: new Date().toISOString(), meetUrl: MEET })
      .expect(403);

    const detail = (await http().get(`/api/v1/modules/${module1}`).set(as('student')).expect(200))
      .body as ModuleDetail;
    const byId = new Map(detail.sessions.map((s) => [s.id, s]));
    expect(byId.get((later.body as LiveSessionSummary).id)?.meetUrl).toBeNull();
    expect(byId.get((live.body as LiveSessionSummary).id)?.meetUrl).toBe(MEET);

    const upcoming = (
      await http().get('/api/v1/me/sessions/upcoming').set(as('student')).expect(200)
    ).body as StudentSession[];
    expect(upcoming.map((s) => s.title)).toEqual(['Starting now', 'Next week']);
    expect(upcoming[0].module).toMatchObject({ id: module1, course: { slug: course.slug } });

    const staffList = (
      await http().get(`/api/v1/modules/${module1}/sessions`).set(as('instructor')).expect(200)
    ).body as StaffSession[];
    expect(staffList.every((s) => s.meetUrl === MEET)).toBe(true);

    const teaching = (await http().get('/api/v1/me/modules').set(as('instructor')).expect(200))
      .body as TeachingModule[];
    expect(teaching.map((m) => m.id)).toEqual([module1]);
    expect(teaching[0]).toMatchObject({
      sessionCount: 2,
      studentCount: 1,
      nextSession: { title: 'Starting now' },
    });
  });

  it('records attendance only for enrolled students', async () => {
    const [session] = (
      await http().get(`/api/v1/modules/${module1}/sessions`).set(as('instructor'))
    ).body as StaffSession[];
    const roster = (
      await http()
        .get(`/api/v1/sessions/${session.id}/attendance`)
        .set(as('instructor'))
        .expect(200)
    ).body as SessionAttendance;
    expect(roster.records).toEqual([
      { user: expect.objectContaining({ id: studentId }) as unknown, present: null },
    ]);

    const saved = await http()
      .put(`/api/v1/sessions/${session.id}/attendance`)
      .set(as('instructor'))
      .send({ records: [{ userId: studentId, present: true }] })
      .expect(200);
    expect((saved.body as SessionAttendance).records[0].present).toBe(true);

    const outsider = await prisma.user.findFirstOrThrow({
      where: { email: `outsider-${run}@example.com` },
    });
    await http()
      .put(`/api/v1/sessions/${session.id}/attendance`)
      .set(as('instructor'))
      .send({ records: [{ userId: outsider.id, present: true }] })
      .expect(400);
    await http().get(`/api/v1/sessions/${session.id}/attendance`).set(as('student')).expect(403);
  });

  it('adds link and file materials; files download only for people who can open the module', async () => {
    const link = await http()
      .post(`/api/v1/modules/${module1}/materials`)
      .set(as('instructor'))
      .send({ title: 'Slides', url: 'https://example.com/slides' })
      .expect(201);
    expect(link.body).toMatchObject({ kind: 'LINK', url: 'https://example.com/slides' });

    const upload = await http()
      .post(`/api/v1/modules/${module1}/materials`)
      .set(as('instructor'))
      .field('title', 'Worksheet')
      .attach('file', Buffer.from('%PDF-1.4 test'), 'worksheet.pdf')
      .expect(201);
    const file = upload.body as MaterialSummary;
    expect(file).toMatchObject({ kind: 'FILE', url: null, fileType: 'pdf' });

    await http()
      .post(`/api/v1/modules/${module1}/materials`)
      .set(as('instructor'))
      .field('title', 'Program')
      .attach('file', Buffer.from('MZ'), 'setup.exe')
      .expect(400);
    await http()
      .post(`/api/v1/modules/${module1}/materials`)
      .set(as('instructor'))
      .send({ title: 'Nothing attached' })
      .expect(400);

    const download = await http()
      .get(`/api/v1/materials/${file.id}/download`)
      .set(as('student'))
      .expect(200);
    expect(download.headers['content-disposition']).toContain('attachment');
    expect(download.headers['content-type']).toContain('application/pdf');
    expect(Buffer.from(download.body as Buffer).toString()).toBe('%PDF-1.4 test');
    await http().get(`/api/v1/materials/${file.id}/download`).set(as('outsider')).expect(403);

    const detail = (await http().get(`/api/v1/modules/${module1}`).set(as('student')))
      .body as ModuleDetail;
    expect(detail.materials.map((m) => m.title).sort()).toEqual(['Slides', 'Worksheet']);

    await http().delete(`/api/v1/materials/${file.id}`).set(as('student')).expect(403);
    await http().delete(`/api/v1/materials/${file.id}`).set(as('instructor')).expect(204);
    await http().get(`/api/v1/materials/${file.id}/download`).set(as('student')).expect(404);
  });

  it('only deletes the last module, and only before anyone has started it', async () => {
    await http().delete(`/api/v1/modules/${module1}`).set(as('admin')).expect(409);
    await http().delete(`/api/v1/modules/${module2}`).set(as('admin')).expect(204);
  });

  it('lets admins manage testimonials; drafts stay off the public list', async () => {
    const created = await http()
      .post('/api/v1/testimonials')
      .set(as('admin'))
      .send({ name: `Draft ${run}`, quote: 'A real quote from a real student.', locale: 'en' })
      .expect(201);
    const draft = created.body as AdminTestimonial;
    expect(draft.isPublished).toBe(false);

    const publicList = await http().get('/api/v1/testimonials?locale=en').expect(200);
    expect(JSON.stringify(publicList.body)).not.toContain(draft.id);
    const adminList = await http()
      .get('/api/v1/testimonials?all=true')
      .set(as('admin'))
      .expect(200);
    expect(JSON.stringify(adminList.body)).toContain(draft.id);

    await http()
      .patch(`/api/v1/testimonials/${draft.id}`)
      .set(as('admin'))
      .send({ isPublished: true })
      .expect(200);
    const after = await http().get('/api/v1/testimonials?locale=en').expect(200);
    expect(JSON.stringify(after.body)).toContain(draft.id);

    await http().delete(`/api/v1/testimonials/${draft.id}`).set(as('student')).expect(403);
    await http().delete(`/api/v1/testimonials/${draft.id}`).set(as('admin')).expect(204);
    await http()
      .patch(`/api/v1/testimonials/${draft.id}`)
      .set(as('admin'))
      .send({ isPublished: true })
      .expect(404);
  });

  it('lets admins edit an instructor’s public profile', async () => {
    const res = await http()
      .patch(`/api/v1/users/${instructorId}/profile`)
      .set(as('admin'))
      .send({ title: 'AI engineer', bio: 'Builds things with AI.' })
      .expect(200);
    expect(res.body).toMatchObject({ title: 'AI engineer', bio: 'Builds things with AI.' });
    expect(res.body).not.toHaveProperty('passwordHash');
    await http()
      .patch(`/api/v1/users/${instructorId}/profile`)
      .set(as('instructor'))
      .send({ title: 'x' })
      .expect(403);
  });
});

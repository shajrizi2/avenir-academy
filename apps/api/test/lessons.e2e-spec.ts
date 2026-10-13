import type { CourseDetail, LessonDetail, LessonSummary, NextLesson } from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { bearer, bootApp, createUser } from './support.js';

/** Offline lessons: staff CRUD and reorder, student access, completion and "continue". */
describe('Lessons (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const run = Date.now();
  let admin: { id: string; token: string };
  let instructor: { id: string; token: string };
  let student: { id: string; token: string };
  let course: CourseDetail;
  let moduleId: string;
  let lessons: LessonSummary[] = [];

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    admin = await createUser(app, prisma, 'admin', 'ADMIN');
    instructor = await createUser(app, prisma, 'instructor', 'INSTRUCTOR');
    student = await createUser(app, prisma, 'student', 'STUDENT');
    course = (
      await http()
        .post('/api/v1/courses')
        .set(bearer(admin.token))
        .send({
          slug: `lessons-${run}`,
          title: 'Kursi i mësimeve',
          summary: 'Një kurs i krijuar nga testi i mësimeve.',
          description: 'Mbulon mësimet offline nga fillimi në fund.',
          isPublished: true,
        })
        .expect(201)
    ).body as CourseDetail;
    moduleId = (
      (
        await http()
          .post(`/api/v1/courses/${course.id}/modules`)
          .set(bearer(admin.token))
          .send({ title: 'Moduli një', description: 'Moduli i parë.', instructorId: instructor.id })
          .expect(201)
      ).body as { id: string }
    ).id;
    // The student is enrolled by hand (admin approval, no payment needed for this suite).
    await http().post(`/api/v1/courses/${course.id}/enroll`).set(bearer(student.token)).expect(201);
    const enrollment = await prisma.enrollment.findFirstOrThrow({ where: { userId: student.id } });
    await http()
      .patch(`/api/v1/enrollments/${enrollment.id}`)
      .set(bearer(admin.token))
      .send({ status: 'APPROVED' })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets the instructor create, edit and reorder lessons', async () => {
    for (const title of ['Hyrje', 'Prompt-et', 'Gabimet']) {
      await http()
        .post(`/api/v1/modules/${moduleId}/lessons`)
        .set(bearer(instructor.token))
        .send({ title, content: `# ${title}\n\nPërmbajtja e mësimit.`, estimatedMin: 10 })
        .expect(201);
    }
    await http()
      .post(`/api/v1/modules/${moduleId}/lessons`)
      .set(bearer(instructor.token))
      .send({ title: 'Video', content: 'x', videoUrl: 'https://example.com/video' })
      .expect(400);
    lessons = (
      await http()
        .get(`/api/v1/modules/${moduleId}/lessons`)
        .set(bearer(instructor.token))
        .expect(200)
    ).body as LessonSummary[];
    expect(lessons.map((l) => [l.order, l.title])).toEqual([
      [1, 'Hyrje'],
      [2, 'Prompt-et'],
      [3, 'Gabimet'],
    ]);

    const reordered = (
      await http()
        .put(`/api/v1/modules/${moduleId}/lessons/order`)
        .set(bearer(instructor.token))
        .send({ ids: [lessons[2].id, lessons[0].id, lessons[1].id] })
        .expect(200)
    ).body as LessonSummary[];
    expect(reordered.map((l) => l.title)).toEqual(['Gabimet', 'Hyrje', 'Prompt-et']);
    lessons = reordered;

    await http()
      .patch(`/api/v1/lessons/${lessons[0].id}`)
      .set(bearer(instructor.token))
      .send({ videoUrl: 'https://youtu.be/dQw4w9WgXcQ', estimatedMin: 8 })
      .expect(200);
    await http()
      .patch(`/api/v1/lessons/${lessons[0].id}`)
      .set(bearer(student.token))
      .send({ title: 'X' })
      .expect(403);
  });

  it('shows students the lesson with navigation, and tracks completion', async () => {
    const detail = (
      await http().get(`/api/v1/lessons/${lessons[1].id}`).set(bearer(student.token)).expect(200)
    ).body as LessonDetail;
    expect(detail).toMatchObject({
      title: 'Hyrje',
      previous: { title: 'Gabimet' },
      next: { title: 'Prompt-et' },
      completedAt: null,
    });
    expect(detail.content).toContain('# Hyrje');

    const next = (await http().get('/api/v1/me/next-lesson').set(bearer(student.token)).expect(200))
      .body as NextLesson;
    expect(next).toMatchObject({
      lesson: { title: 'Gabimet' },
      completedLessons: 0,
      totalLessons: 3,
    });

    await http()
      .post(`/api/v1/lessons/${lessons[0].id}/complete`)
      .set(bearer(student.token))
      .send({})
      .expect(200);
    const after = (
      await http().get('/api/v1/me/next-lesson').set(bearer(student.token)).expect(200)
    ).body as NextLesson;
    expect(after).toMatchObject({ lesson: { title: 'Hyrje' }, completedLessons: 1 });

    await http()
      .post(`/api/v1/lessons/${lessons[0].id}/complete`)
      .set(bearer(student.token))
      .send({ done: false })
      .expect(200);
    const list = (
      await http().get(`/api/v1/modules/${moduleId}/lessons`).set(bearer(student.token)).expect(200)
    ).body as LessonSummary[];
    expect(list.every((l) => l.completedAt === null)).toBe(true);

    const outsider = await createUser(app, prisma, 'outsider', 'STUDENT');
    await http().get(`/api/v1/lessons/${lessons[0].id}`).set(bearer(outsider.token)).expect(403);
  });

  it('deletes a lesson and renumbers the rest', async () => {
    await http()
      .delete(`/api/v1/lessons/${lessons[0].id}`)
      .set(bearer(instructor.token))
      .expect(204);
    const list = (
      await http()
        .get(`/api/v1/modules/${moduleId}/lessons`)
        .set(bearer(instructor.token))
        .expect(200)
    ).body as LessonSummary[];
    expect(list.map((l) => [l.order, l.title])).toEqual([
      [1, 'Hyrje'],
      [2, 'Prompt-et'],
    ]);
  });
});

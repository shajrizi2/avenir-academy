import type {
  AdminGroup,
  AdminPayment,
  CheckoutResult,
  CourseDetail,
  EnrollmentSummary,
  LearnCourse,
  Paginated,
  PaymentSummary,
} from '@ai-academy/shared';
import type { INestApplication } from '@nestjs/common';
import type Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ModuleStatus } from '../src/generated/prisma/enums.js';
import type { MailMessage } from '../src/mail/mail.service.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import { createFakeStripeClient, STRIPE_CLIENT } from '../src/modules/payments/stripe.provider.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  bearer,
  bootApp,
  captureMail,
  checkoutCompletedEvent,
  createUser,
  MEET,
  signStripeEvent,
} from './support.js';

/** Groups, seat holds, Stripe and bank-transfer checkout, webhooks, holds and progression. */
describe('Payments and groups (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let payments: PaymentsService;
  let mail: MailMessage[];
  const createdSessions: Stripe.Checkout.SessionCreateParams[] = [];
  const run = Date.now();
  let admin: { id: string; token: string };
  let course: CourseDetail;
  let group: AdminGroup;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const fake = createFakeStripeClient('http://localhost:3000');
    const recording = {
      ...fake,
      checkout: {
        sessions: {
          ...fake.checkout.sessions,
          create: (params: Stripe.Checkout.SessionCreateParams) => {
            createdSessions.push(params);
            return fake.checkout.sessions.create(params);
          },
        },
      },
    };
    ({ app, prisma } = await bootApp((b) => b.overrideProvider(STRIPE_CLIENT).useValue(recording)));
    payments = app.get(PaymentsService);
    mail = captureMail();
    admin = await createUser(app, prisma, 'admin', 'ADMIN');

    course = (
      await http()
        .post('/api/v1/courses')
        .set(bearer(admin.token))
        .send({
          slug: `pay-${run}`,
          title: 'Kursi i pagesave',
          summary: 'Një kurs i krijuar nga testi e2e i pagesave.',
          description: 'Mbulon grupet, pagesat dhe progresin nga fillimi në fund.',
          isPublished: true,
          priceCents: 8900,
          listPriceCents: 15000,
          currency: 'EUR',
        })
        .expect(201)
    ).body as CourseDetail;
    for (const title of ['Moduli një', 'Moduli dy']) {
      await http()
        .post(`/api/v1/courses/${course.id}/modules`)
        .set(bearer(admin.token))
        .send({ title, description: `${title} i kursit të pagesave.` })
        .expect(201);
    }
    course = (await http().get(`/api/v1/courses/by-id/${course.id}`).set(bearer(admin.token)))
      .body as CourseDetail;
    await http()
      .patch('/api/v1/site-settings')
      .set(bearer(admin.token))
      .send({
        bankIban: 'AL47212110090000000235698741',
        bankBeneficiary: 'Avenir Academy',
        bankName: 'Banka Test',
      })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a group and generates 12 lectures per module from the schedule', async () => {
    group = (
      await http()
        .post(`/api/v1/courses/${course.id}/groups`)
        .set(bearer(admin.token))
        .send({
          name: 'Grupi 1 – Nëntor 2026',
          startDate: '2026-11-01',
          weekdays: [1, 3, 5],
          startTime: '19:00',
          capacity: 2,
          meetUrl: MEET,
        })
        .expect(201)
    ).body as AdminGroup;
    expect(group).toMatchObject({
      seatsLeft: 2,
      status: 'OPEN',
      sessionCount: 24,
      endDate: '2026-12-25',
    });

    const sessions = await prisma.liveSession.findMany({
      where: { groupId: group.id },
      orderBy: { startsAt: 'asc' },
    });
    // 1 November 2026 is a Sunday: the first lecture is Monday the 2nd at 19:00 Tirana (18:00 UTC).
    expect(sessions[0].startsAt.toISOString()).toBe('2026-11-02T18:00:00.000Z');
    expect(sessions[0].moduleId).toBe(course.modules[0].id);
    expect(sessions[12].moduleId).toBe(course.modules[1].id);

    await http()
      .post(`/api/v1/courses/${course.id}/groups`)
      .set(bearer(admin.token))
      .send({
        name: 'Tepër i madh',
        startDate: '2026-11-01',
        weekdays: [1],
        startTime: '19:00',
        capacity: 11,
      })
      .expect(400);
    const publicList = (await http().get(`/api/v1/groups?courseId=${course.id}`).expect(200))
      .body as AdminGroup[];
    expect(publicList).toHaveLength(1);
    expect(publicList[0]).not.toHaveProperty('meetUrl');
  });

  it('never gives the last seat to two students at once', async () => {
    // Capacity 2: five students start checkout at the same moment.
    const students = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createUser(app, prisma, `race${i}`, 'STUDENT')),
    );
    const results = await Promise.all(
      students.map((s) =>
        http()
          .post('/api/v1/checkout')
          .set(bearer(s.token))
          .send({ groupId: group.id, provider: 'BANK_TRANSFER' }),
      ),
    );
    const kinds = results.map((r) => (r.body as CheckoutResult).kind);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(kinds.filter((k) => k === 'BANK_TRANSFER')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'WAITLISTED')).toHaveLength(3);
    const after = (await http().get(`/api/v1/groups/${group.id}`).expect(200)).body as AdminGroup;
    expect(after).toMatchObject({ seatsLeft: 0, status: 'FULL' });

    // Clean the slate for the rest of the suite: the holds are released by hand.
    await prisma.enrollment.deleteMany({ where: { groupId: group.id } });
  });

  let student: { id: string; email: string; token: string };
  let stripePaymentId: string;
  let stripeSessionId: string;

  it('starts a Stripe checkout from the course price, with our ids in the metadata', async () => {
    student = await createUser(app, prisma, 'student', 'STUDENT');
    createdSessions.length = 0;
    const res = (
      await http()
        .post('/api/v1/checkout')
        .set(bearer(student.token))
        .send({ groupId: group.id, provider: 'STRIPE' })
        .expect(200)
    ).body as CheckoutResult;
    expect(res.kind).toBe('STRIPE');
    if (res.kind !== 'STRIPE') return;
    stripePaymentId = res.paymentId;
    expect(res.url).toContain('/checkout/success?payment=');
    // The hold is 30 minutes (plus Stripe's own margin is on their side).
    expect(new Date(res.expiresAt).getTime() - Date.now()).toBeGreaterThan(29 * 60_000);

    const params = createdSessions[0];
    expect(params.mode).toBe('payment');
    expect(params.line_items?.[0].price_data).toMatchObject({ currency: 'eur', unit_amount: 8900 });
    expect(params.client_reference_id).toBe(stripePaymentId);
    expect(params.metadata).toMatchObject({
      paymentId: stripePaymentId,
      groupId: group.id,
      moduleId: course.modules[0].id,
    });
    expect(params.customer_email).toBe(student.email);
    expect(params.locale).toBe('auto');
    expect(params.success_url).toContain(`/checkout/success?payment=${stripePaymentId}`);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: stripePaymentId } });
    stripeSessionId = payment.stripeSessionId!;
    expect(payment.status).toBe('PENDING');
    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    expect(enrollment.status).toBe('PENDING_PAYMENT');
    expect(enrollment.holdExpiresAt?.getTime()).toBe(payment.holdExpiresAt?.getTime());
  });

  it('rejects a webhook with a bad signature and never confirms from the redirect alone', async () => {
    const { payload } = signStripeEvent(checkoutCompletedEvent(stripeSessionId, stripePaymentId));
    await http()
      .post('/api/v1/payments/stripe/webhook')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(400);
    await http()
      .post('/api/v1/payments/stripe/webhook')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(400);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: stripePaymentId } });
    expect(payment.status).toBe('PENDING');
  });

  it('confirms the payment once even when the webhook is delivered twice, and sends the timetable', async () => {
    mail.length = 0;
    const event = checkoutCompletedEvent(stripeSessionId, stripePaymentId);
    const { payload, signature } = signStripeEvent(event);
    for (let i = 0; i < 2; i++) {
      await http()
        .post('/api/v1/payments/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);
    }
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: stripePaymentId } });
    expect(payment).toMatchObject({
      status: 'CONFIRMED',
      stripePaymentIntentId: `pi_${stripeSessionId}`,
    });
    expect(payment.receiptUrl).toContain('receipt.stripe.test');
    expect(await prisma.stripeEvent.count({ where: { id: event.id } })).toBe(1);

    // The enrollment is active: module 1 ACTIVE, module 2 LOCKED.
    const learn = (
      await http().get(`/api/v1/me/courses/${course.slug}`).set(bearer(student.token)).expect(200)
    ).body as LearnCourse;
    expect(learn.modules.map((m) => [m.status, m.paid])).toEqual([
      ['ACTIVE', true],
      ['LOCKED', false],
    ]);
    expect(learn.group?.id).toBe(group.id);

    // One confirmation email with all 12 lectures of the month and the .ics attachment.
    const confirmations = mail.filter((m) => m.subject.startsWith('Je regjistruar'));
    expect(confirmations).toHaveLength(1);
    const [email] = confirmations;
    expect(email.to).toBe(student.email);
    expect(email.text.match(/Leksioni \d+/g)).toHaveLength(12);
    expect(email.text).toContain('e hënë, 2 nëntor 2026, 19:00–21:00');
    expect(email.text).toContain(MEET);
    expect(email.text).toContain('kujtese');
    expect(email.attachments?.[0].filename).toMatch(/\.ics$/);
    const ics = String(email.attachments?.[0].content);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(12);
    expect(ics).toContain('DTSTART:20261102T180000Z');
    expect(
      await prisma.emailLog.count({
        where: { type: 'REGISTRATION_CONFIRMED', userId: student.id },
      }),
    ).toBe(1);

    const mine = (await http().get('/api/v1/me/enrollments').set(bearer(student.token)).expect(200))
      .body as EnrollmentSummary[];
    expect(mine[0]).toMatchObject({ status: 'APPROVED', paidModuleIds: [course.modules[0].id] });
  });

  it('frees the seat when a Stripe session expires', async () => {
    const other = await createUser(app, prisma, 'expiring', 'STUDENT');
    const res = (
      await http()
        .post('/api/v1/checkout')
        .set(bearer(other.token))
        .send({ groupId: group.id, provider: 'STRIPE' })
        .expect(200)
    ).body as CheckoutResult;
    if (res.kind !== 'STRIPE') throw new Error('expected a Stripe checkout');
    const before = (await http().get(`/api/v1/groups/${group.id}`)).body as AdminGroup;
    expect(before.seatsLeft).toBe(0);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.paymentId } });
    const { payload, signature } = signStripeEvent({
      id: `evt_exp_${run}`,
      object: 'event',
      type: 'checkout.session.expired',
      data: {
        object: {
          id: payment.stripeSessionId,
          object: 'checkout.session',
          client_reference_id: payment.id,
        },
      },
    });
    mail.length = 0;
    await http()
      .post('/api/v1/payments/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      'EXPIRED',
    );
    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: other.id, courseId: course.id } },
    });
    expect(enrollment.status).toBe('EXPIRED');
    const after = (await http().get(`/api/v1/groups/${group.id}`)).body as AdminGroup;
    expect(after.seatsLeft).toBe(1);
    expect(mail.map((m) => m.subject)).toContain(`Afati i pagesës skadoi: ${course.title}`);
  });

  let bankStudent: { id: string; email: string; token: string };
  let bankPaymentId: string;

  it('gives bank-transfer students the IBAN and a unique reference, and holds the seat 48 hours', async () => {
    bankStudent = await createUser(app, prisma, 'bank', 'STUDENT');
    mail.length = 0;
    const res = (
      await http()
        .post('/api/v1/checkout')
        .set(bearer(bankStudent.token))
        .send({ groupId: group.id, provider: 'BANK_TRANSFER' })
        .expect(200)
    ).body as CheckoutResult;
    expect(res.kind).toBe('BANK_TRANSFER');
    if (res.kind !== 'BANK_TRANSFER') return;
    bankPaymentId = res.paymentId;
    expect(res.payment.bank).toMatchObject({
      iban: 'AL47212110090000000235698741',
      amountCents: 8900,
    });
    expect(res.payment.reference).toMatch(/^AV-[A-Z2-9]{8}$/);
    const hold = new Date(res.payment.holdExpiresAt!).getTime() - Date.now();
    expect(hold).toBeGreaterThan(47 * 60 * 60_000);
    expect(hold).toBeLessThanOrEqual(48 * 60 * 60_000);
    expect(mail.map((m) => m.subject)).toContain(`Të dhënat për pagesën: ${course.title}`);
    expect(mail[0].text).toContain(res.payment.reference);

    const page = (
      await http().get('/api/v1/me/payments').set(bearer(bankStudent.token)).expect(200)
    ).body as PaymentSummary[];
    expect(page[0].id).toBe(bankPaymentId);
  });

  it('warns 12 hours before a bank hold ends, then expires it and frees the seat', async () => {
    const soon = new Date(Date.now() + 6 * 60 * 60_000);
    await prisma.payment.update({ where: { id: bankPaymentId }, data: { holdExpiresAt: soon } });
    await prisma.enrollment.updateMany({
      where: { userId: bankStudent.id },
      data: { holdExpiresAt: soon },
    });
    mail.length = 0;
    expect(await payments.warnExpiringHolds()).toBe(1);
    expect(await payments.warnExpiringHolds()).toBe(0); // idempotent
    expect(mail).toHaveLength(1);
    expect(mail[0].subject).toContain('skadon së shpejti');

    // Not due yet: nothing expires. Then time passes.
    expect(await payments.expireHolds()).toBe(0);
    mail.length = 0;
    expect(await payments.expireHolds(new Date(soon.getTime() + 1000))).toBe(1);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: bankPaymentId } })).status).toBe(
      'EXPIRED',
    );
    const enrollment = await prisma.enrollment.findFirstOrThrow({
      where: { userId: bankStudent.id },
    });
    expect(enrollment.status).toBe('EXPIRED');
    expect(mail[0].subject).toContain('Afati i pagesës skadoi');
  });

  it('lets an admin confirm a bank transfer, which activates the enrollment', async () => {
    const res = (
      await http()
        .post('/api/v1/checkout')
        .set(bearer(bankStudent.token))
        .send({ groupId: group.id, provider: 'BANK_TRANSFER' })
        .expect(200)
    ).body as CheckoutResult;
    if (res.kind !== 'BANK_TRANSFER') throw new Error('expected bank transfer');
    await http()
      .post(`/api/v1/payments/${res.paymentId}/confirm`)
      .set(bearer(bankStudent.token))
      .expect(403);

    const list = (
      await http()
        .get('/api/v1/payments?provider=BANK_TRANSFER&status=PENDING')
        .set(bearer(admin.token))
        .expect(200)
    ).body as Paginated<AdminPayment>;
    expect(list.items.map((p) => p.id)).toContain(res.paymentId);

    mail.length = 0;
    const confirmed = (
      await http()
        .post(`/api/v1/payments/${res.paymentId}/confirm`)
        .set(bearer(admin.token))
        .send({ note: 'Parë në llogari' })
        .expect(200)
    ).body as AdminPayment;
    expect(confirmed).toMatchObject({
      status: 'CONFIRMED',
      note: 'Parë në llogari',
      confirmedBy: { id: admin.id },
    });
    const learn = (
      await http()
        .get(`/api/v1/me/courses/${course.slug}`)
        .set(bearer(bankStudent.token))
        .expect(200)
    ).body as LearnCourse;
    expect(learn.modules[0]).toMatchObject({ status: 'ACTIVE', paid: true });
    expect(mail.map((m) => m.subject)).toContain(`Je regjistruar në ${course.title}`);
    await http()
      .post(`/api/v1/payments/${res.paymentId}/confirm`)
      .set(bearer(admin.token))
      .expect(409);

    const csv = await http()
      .get('/api/v1/payments/export.csv')
      .set(bearer(admin.token))
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain(confirmed.reference);
  });

  it('opens the next module only when the test is passed AND the month is paid', async () => {
    const [module1, module2] = course.modules;
    const progress = await prisma.moduleProgress.findUniqueOrThrow({
      where: { userId_moduleId: { userId: student.id, moduleId: module1.id } },
    });
    // Passed module 1 by an admin override: module 2 stays LOCKED because it is unpaid.
    await http()
      .patch(`/api/v1/progress/${progress.id}`)
      .set(bearer(admin.token))
      .send({ status: 'PASSED' })
      .expect(200);
    const locked = await prisma.moduleProgress.findUnique({
      where: { userId_moduleId: { userId: student.id, moduleId: module2.id } },
    });
    expect(locked?.status).toBe(ModuleStatus.LOCKED);
    await http().get(`/api/v1/modules/${module2.id}`).set(bearer(student.token)).expect(403);

    // Paying month 2 opens it.
    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    const res = (
      await http()
        .post(`/api/v1/enrollments/${enrollment.id}/payments`)
        .set(bearer(student.token))
        .send({ moduleId: module2.id, provider: 'STRIPE' })
        .expect(200)
    ).body as CheckoutResult;
    if (res.kind !== 'STRIPE') throw new Error('expected stripe');
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.paymentId } });
    mail.length = 0;
    const { payload, signature } = signStripeEvent(
      checkoutCompletedEvent(payment.stripeSessionId!, payment.id),
    );
    await http()
      .post('/api/v1/payments/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200);
    const learn = (
      await http().get(`/api/v1/me/courses/${course.slug}`).set(bearer(student.token)).expect(200)
    ).body as LearnCourse;
    expect(learn.modules.map((m) => [m.status, m.paid])).toEqual([
      ['PASSED', true],
      ['ACTIVE', true],
    ]);
    expect(mail.map((m) => m.subject)).toContain('Pagesa u konfirmua: Moduli 2: Moduli dy');
    await http().get(`/api/v1/modules/${module2.id}`).set(bearer(student.token)).expect(200);
    // Paying twice is refused.
    await http()
      .post(`/api/v1/enrollments/${enrollment.id}/payments`)
      .set(bearer(student.token))
      .send({ moduleId: module2.id, provider: 'STRIPE' })
      .expect(409);
  });

  it('refunds a confirmed card payment and emails the student', async () => {
    const paid = await prisma.payment.findFirstOrThrow({
      where: {
        enrollment: { userId: student.id },
        moduleId: course.modules[1].id,
        status: 'CONFIRMED',
      },
    });
    mail.length = 0;
    const refunded = (
      await http()
        .post(`/api/v1/payments/${paid.id}/refund`)
        .set(bearer(admin.token))
        .send({})
        .expect(200)
    ).body as AdminPayment;
    expect(refunded.status).toBe('REFUNDED');
    expect(mail.map((m) => m.subject)).toContain('Rimbursim: Moduli 2: Moduli dy');
    // Stripe's own charge.refunded event for the same payment changes nothing more.
    const { payload, signature } = signStripeEvent({
      id: `evt_ref_${run}`,
      object: 'event',
      type: 'charge.refunded',
      data: {
        object: { id: 'ch_x', object: 'charge', payment_intent: paid.stripePaymentIntentId },
      },
    });
    await http()
      .post('/api/v1/payments/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200);
    expect(mail.filter((m) => m.subject.startsWith('Rimbursim'))).toHaveLength(1);
  });

  it('moves a waitlisted student into a group with a 48-hour hold and emails them', async () => {
    // Fill the group (capacity 2: student + bankStudent are APPROVED), then a newcomer waits.
    const waiting = await createUser(app, prisma, 'waiting', 'STUDENT');
    const res = (
      await http()
        .post('/api/v1/checkout')
        .set(bearer(waiting.token))
        .send({ groupId: group.id, provider: 'STRIPE' })
        .expect(200)
    ).body as CheckoutResult;
    expect(res.kind).toBe('WAITLISTED');
    expect(mail.some((m) => m.subject.startsWith('Je në listën e pritjes'))).toBe(true);

    const second = (
      await http()
        .post(`/api/v1/courses/${course.id}/groups`)
        .set(bearer(admin.token))
        .send({
          name: 'Grupi 2',
          startDate: '2026-12-01',
          weekdays: [2, 4],
          startTime: '18:00',
          capacity: 3,
        })
        .expect(201)
    ).body as AdminGroup;
    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: waiting.id, courseId: course.id } },
    });
    mail.length = 0;
    const moved = await http()
      .patch(`/api/v1/enrollments/${enrollment.id}/move`)
      .set(bearer(admin.token))
      .send({ groupId: second.id })
      .expect(200);
    expect(moved.body).toMatchObject({ status: 'PENDING_PAYMENT', group: { id: second.id } });
    expect(mail[0].subject).toContain('Një vend për ty');
    expect(mail[0].text).toContain(`/checkout/${second.id}`);
    const seats = (await http().get(`/api/v1/groups/${second.id}`)).body as AdminGroup;
    expect(seats.seatsLeft).toBe(2);
  });
});

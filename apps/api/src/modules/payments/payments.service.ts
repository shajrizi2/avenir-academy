import { randomBytes } from 'node:crypto';
import {
  HOLD_EXPIRING_WARNING_HOURS,
  type Paginated,
  WAITLIST_OFFER_HOURS,
} from '@ai-academy/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../../common/auth-user.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import {
  EmailType,
  EnrollmentStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { buildIcs } from '../../mail/ics.js';
import { MailService } from '../../mail/mail.service.js';
import * as templates from '../../mail/templates.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { activateEnrollment } from '../enrollments/enrollment-activation.js';
import { GroupsService } from '../groups/groups.service.js';
import { unlockIfReady } from '../progress/progression.js';
import { SiteSettingsService } from '../site-settings/site-settings.service.js';
import { BankTransferProvider } from './bank-transfer.provider.js';
import type { CheckoutDto } from './dto/checkout.dto.js';
import type { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';
import type { ManualPaymentDto } from './dto/manual-payment.dto.js';
import type { PayModuleDto } from './dto/pay-module.dto.js';
import type { PaymentProvider } from './payment-provider.js';
import { StripeProvider } from './stripe.provider.js';

type Tx = Prisma.TransactionClient;

const paymentSelect = {
  id: true,
  enrollmentId: true,
  amountCents: true,
  currency: true,
  provider: true,
  status: true,
  reference: true,
  receiptUrl: true,
  holdExpiresAt: true,
  confirmedAt: true,
  createdAt: true,
  note: true,
  refundedAt: true,
  failedAt: true,
  stripePaymentIntentId: true,
  module: { select: { id: true, order: true, title: true } },
  confirmedBy: { select: { id: true, firstName: true, lastName: true } },
  enrollment: {
    select: {
      userId: true,
      course: { select: { id: true, slug: true, title: true } },
      group: { select: { id: true, name: true, startDate: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} as const satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

export interface BankInstructionsRecord {
  beneficiary: string | null;
  iban: string | null;
  bankName: string | null;
  swift: string | null;
  reference: string;
  amountCents: number;
  currency: string;
  payBy: Date | null;
}

export interface PaymentRecord {
  id: string;
  enrollmentId: string;
  module: { id: string; order: number; title: string };
  course: { id: string; slug: string; title: string };
  group: { id: string; name: string; startDate: Date } | null;
  amountCents: number;
  currency: string;
  provider: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  receiptUrl: string | null;
  holdExpiresAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  bank: BankInstructionsRecord | null;
}

export interface AdminPaymentRecord extends PaymentRecord {
  user: { id: string; firstName: string; lastName: string; email: string };
  note: string | null;
  confirmedBy: { id: string; firstName: string; lastName: string } | null;
  refundedAt: Date | null;
  failedAt: Date | null;
  stripePaymentIntentId: string | null;
}

export type CheckoutResultRecord =
  | { kind: 'STRIPE'; paymentId: string; url: string; expiresAt: Date }
  | { kind: 'BANK_TRANSFER'; paymentId: string; payment: PaymentRecord }
  | {
      kind: 'WAITLISTED';
      enrollmentId: string;
      group: { id: string; name: string; startDate: Date };
    };

/** Unambiguous characters for references students type into their bank's app. */
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeReference(prefix = 'AV'): string {
  const bytes = randomBytes(8);
  let code = '';
  for (const b of bytes) code += REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length];
  return `${prefix}-${code}`;
}

/**
 * Payments: one per month (module) of an enrollment. The first month's payment holds a seat
 * in the group until it is confirmed (Stripe webhook or admin) or the hold expires.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupsService,
    private readonly mail: MailService,
    private readonly settings: SiteSettingsService,
    private readonly stripe: StripeProvider,
    private readonly bank: BankTransferProvider,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  // ---- Providers ----

  private providerFor(method: PaymentMethod): PaymentProvider {
    return method === PaymentMethod.STRIPE ? this.stripe : this.bank;
  }

  /** Methods a student may pick right now (admin toggles plus server configuration). */
  async enabledMethods(): Promise<PaymentMethod[]> {
    const settings = await this.settings.get();
    const methods: PaymentMethod[] = [];
    if (settings.stripeEnabled && this.stripe.isConfigured()) methods.push(PaymentMethod.STRIPE);
    if (settings.bankTransferEnabled) methods.push(PaymentMethod.BANK_TRANSFER);
    return methods;
  }

  private async assertMethod(method: PaymentMethod): Promise<PaymentProvider> {
    const enabled = await this.enabledMethods();
    if (!enabled.includes(method)) {
      throw new BadRequestException(
        method === PaymentMethod.STRIPE
          ? 'Pagesa me kartë nuk është e disponueshme për momentin. Zgjidh transfertën bankare.'
          : 'Transferta bankare nuk është e disponueshme për momentin.',
      );
    }
    return this.providerFor(method);
  }

  // ---- Student: checkout ----

  /**
   * Starts the first month's payment for a group. Inside one transaction the group row is
   * locked, the free seats counted and the seat held (PENDING_PAYMENT), so two students can't
   * both take the last seat; a full group puts the student on the waitlist instead.
   */
  async checkout(user: AuthUser, dto: CheckoutDto): Promise<CheckoutResultRecord> {
    const provider = await this.assertMethod(dto.provider);
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        courseId: true,
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            isPublished: true,
            priceCents: true,
            currency: true,
            modules: {
              orderBy: { order: 'asc' },
              take: 1,
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
    });
    if (!group || !group.course.isPublished) throw new NotFoundException('Grupi nuk u gjet');
    if (group.status !== 'OPEN' && group.status !== 'FULL') {
      throw new ConflictException('Ky grup nuk pranon më regjistrime');
    }
    const firstModule = group.course.modules[0];
    if (!firstModule) throw new ConflictException('Ky kurs nuk ka ende module');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + provider.holdMs);
    const outcome = await this.prisma.$transaction(async (tx) => {
      const { free } = await this.groups.lockAndCountFree(tx, group.id, now);
      const existing = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: group.courseId } },
        select: { id: true, status: true, groupId: true, holdExpiresAt: true },
      });
      if (existing?.status === EnrollmentStatus.APPROVED) {
        throw new ConflictException('Je tashmë i regjistruar në këtë kurs');
      }
      if (existing?.status === EnrollmentStatus.REJECTED) {
        throw new ConflictException('Kërkesa jote për këtë kurs u refuzua. Na kontakto.');
      }
      const holdsSeatHere =
        existing?.status === EnrollmentStatus.PENDING_PAYMENT &&
        existing.groupId === group.id &&
        existing.holdExpiresAt !== null &&
        existing.holdExpiresAt > now;

      if (free === 0 && !holdsSeatHere) {
        const enrollment = existing
          ? await tx.enrollment.update({
              where: { id: existing.id },
              data: { groupId: group.id, status: EnrollmentStatus.WAITLISTED, holdExpiresAt: null },
              select: { id: true },
            })
          : await tx.enrollment.create({
              data: {
                userId: user.id,
                courseId: group.courseId,
                groupId: group.id,
                status: EnrollmentStatus.WAITLISTED,
              },
              select: { id: true },
            });
        return { kind: 'waitlisted' as const, enrollmentId: enrollment.id };
      }

      const enrollment = existing
        ? await tx.enrollment.update({
            where: { id: existing.id },
            data: {
              groupId: group.id,
              status: EnrollmentStatus.PENDING_PAYMENT,
              holdExpiresAt: expiresAt,
              decidedAt: null,
            },
            select: { id: true },
          })
        : await tx.enrollment.create({
            data: {
              userId: user.id,
              courseId: group.courseId,
              groupId: group.id,
              status: EnrollmentStatus.PENDING_PAYMENT,
              holdExpiresAt: expiresAt,
            },
            select: { id: true },
          });
      const stale = await this.expirePending(tx, enrollment.id, firstModule.id, now);
      const payment = await this.createPayment(tx, {
        enrollmentId: enrollment.id,
        moduleId: firstModule.id,
        amountCents: group.course.priceCents,
        currency: group.course.currency,
        provider: dto.provider,
        holdExpiresAt: expiresAt,
      });
      return { kind: 'held' as const, enrollmentId: enrollment.id, paymentId: payment.id, stale };
    });

    if (outcome.kind === 'waitlisted') {
      await this.sendWaitlisted(outcome.enrollmentId, group);
      return {
        kind: 'WAITLISTED',
        enrollmentId: outcome.enrollmentId,
        group: { id: group.id, name: group.name, startDate: group.startDate },
      };
    }
    for (const sessionId of outcome.stale) void this.stripe.expireSession(sessionId);
    return this.startWithProvider(provider, outcome.paymentId, {
      user,
      courseTitle: group.course.title,
      moduleTitle: `Moduli ${firstModule.order}: ${firstModule.title}`,
      groupId: group.id,
      moduleId: firstModule.id,
      expiresAt,
    });
  }

  /** A later month of an enrollment the student already has. */
  async payModule(
    user: AuthUser,
    enrollmentId: string,
    dto: PayModuleDto,
  ): Promise<CheckoutResultRecord> {
    const provider = await this.assertMethod(dto.provider);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        groupId: true,
        course: {
          select: {
            id: true,
            title: true,
            priceCents: true,
            currency: true,
            modules: {
              where: { id: dto.moduleId },
              select: { id: true, order: true, title: true },
            },
          },
        },
      },
    });
    if (!enrollment || enrollment.userId !== user.id)
      throw new NotFoundException('Regjistrimi nuk u gjet');
    if (enrollment.status !== EnrollmentStatus.APPROVED) {
      throw new ConflictException('Paguaj fillimisht muajin e parë që të konfirmohet regjistrimi');
    }
    const module = enrollment.course.modules[0];
    if (!module) throw new NotFoundException('Moduli nuk u gjet');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + provider.holdMs);
    const { paymentId, stale } = await this.prisma.$transaction(async (tx) => {
      const paid = await tx.payment.count({
        where: { enrollmentId, moduleId: module.id, status: PaymentStatus.CONFIRMED },
      });
      if (paid > 0) throw new ConflictException('Ky muaj është paguar tashmë');
      const stale = await this.expirePending(tx, enrollmentId, module.id, now);
      const payment = await this.createPayment(tx, {
        enrollmentId,
        moduleId: module.id,
        amountCents: enrollment.course.priceCents,
        currency: enrollment.course.currency,
        provider: dto.provider,
        holdExpiresAt: expiresAt,
      });
      return { paymentId: payment.id, stale };
    });
    for (const sessionId of stale) void this.stripe.expireSession(sessionId);
    return this.startWithProvider(provider, paymentId, {
      user,
      courseTitle: enrollment.course.title,
      moduleTitle: `Moduli ${module.order}: ${module.title}`,
      groupId: enrollment.groupId,
      moduleId: module.id,
      expiresAt,
    });
  }

  private async startWithProvider(
    provider: PaymentProvider,
    paymentId: string,
    ctx: {
      user: AuthUser;
      courseTitle: string;
      moduleTitle: string;
      groupId: string | null;
      moduleId: string;
      expiresAt: Date;
    },
  ): Promise<CheckoutResultRecord> {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: paymentSelect,
    });
    let start;
    try {
      start = await provider.createCheckout({
        paymentId,
        reference: payment.reference,
        amountCents: payment.amountCents,
        currency: payment.currency,
        description: `${ctx.courseTitle} · ${ctx.moduleTitle}`,
        courseTitle: ctx.courseTitle,
        customerEmail: ctx.user.email,
        metadata: {
          paymentId,
          enrollmentId: payment.enrollmentId,
          groupId: ctx.groupId ?? '',
          moduleId: ctx.moduleId,
          userId: ctx.user.id,
        },
        expiresAt: ctx.expiresAt,
        successUrl: `${this.webUrl}/checkout/success?payment=${paymentId}`,
        cancelUrl: `${this.webUrl}/checkout/${ctx.groupId ?? ''}?module=${ctx.moduleId}&cancelled=1`,
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED, failedAt: new Date() },
      });
      throw error;
    }
    if (start.kind === 'redirect') {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { stripeSessionId: start.externalId },
      });
      return { kind: 'STRIPE', paymentId, url: start.url, expiresAt: ctx.expiresAt };
    }
    const record = await this.toRecord(payment);
    await this.sendPaymentPending(payment, record);
    return { kind: 'BANK_TRANSFER', paymentId, payment: record };
  }

  private async createPayment(
    tx: Tx,
    data: {
      enrollmentId: string;
      moduleId: string;
      amountCents: number;
      currency: string;
      provider: PaymentMethod;
      holdExpiresAt: Date;
    },
  ): Promise<{ id: string }> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await tx.payment.create({
          data: { ...data, reference: makeReference() },
          select: { id: true },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          throw error;
        }
      }
    }
    throw new ConflictException('Nuk u gjenerua dot një referencë unike; provo sërish');
  }

  /** Closes earlier pending payments of the same month; returns the Stripe sessions to expire. */
  private async expirePending(
    tx: Tx,
    enrollmentId: string,
    moduleId: string,
    now: Date,
  ): Promise<string[]> {
    const stale = await tx.payment.findMany({
      where: { enrollmentId, moduleId, status: PaymentStatus.PENDING },
      select: { id: true, stripeSessionId: true },
    });
    if (stale.length === 0) return [];
    await tx.payment.updateMany({
      where: { id: { in: stale.map((p) => p.id) } },
      data: { status: PaymentStatus.EXPIRED, holdExpiresAt: now },
    });
    return stale.map((p) => p.stripeSessionId).filter((id): id is string => Boolean(id));
  }

  // ---- Student: reading ----

  async listForUser(userId: string): Promise<PaymentRecord[]> {
    const rows = await this.prisma.payment.findMany({
      where: { enrollment: { userId } },
      orderBy: { createdAt: 'desc' },
      select: paymentSelect,
    });
    return Promise.all(rows.map((r) => this.toRecord(r)));
  }

  async findForUser(user: AuthUser, id: string): Promise<PaymentRecord> {
    const row = await this.prisma.payment.findUnique({ where: { id }, select: paymentSelect });
    if (!row || row.enrollment.userId !== user.id) throw new NotFoundException('Pagesa nuk u gjet');
    return this.toRecord(row);
  }

  // ---- Stripe webhook ----

  /**
   * Verifies the signature, records the event id (a redelivery is acknowledged and ignored)
   * and applies the outcome. Only this confirms a card payment.
   */
  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    const { id, type, event } = await this.stripe.handleWebhook(rawBody, signature);
    try {
      await this.prisma.stripeEvent.create({ data: { id, type } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.log(`Stripe event ${id} already processed`);
        return { received: true };
      }
      throw error;
    }

    switch (event.kind) {
      case 'paid': {
        const payment = await this.findByStripe(event.paymentId, event.externalId);
        if (!payment) break;
        const [receiptUrl, chargeId] = event.paymentIntentId
          ? await Promise.all([
              this.stripe.receiptUrl(event.paymentIntentId),
              this.stripe.chargeId(event.paymentIntentId),
            ])
          : [null, null];
        await this.applyConfirmed(payment.id, {
          stripe: { paymentIntentId: event.paymentIntentId, chargeId, receiptUrl },
        });
        break;
      }
      case 'failed': {
        const payment = await this.findByStripe(event.paymentId, event.externalId);
        if (payment) await this.applyFailed(payment.id, 'card');
        break;
      }
      case 'expired': {
        const payment = await this.findByStripe(event.paymentId, event.externalId);
        if (payment) await this.expirePayment(payment.id, new Date());
        break;
      }
      case 'refunded': {
        const payment = await this.prisma.payment.findFirst({
          where: { stripePaymentIntentId: event.paymentIntentId },
          select: { id: true },
        });
        if (payment) await this.applyRefunded(payment.id, null, null);
        break;
      }
      case 'ignored':
        break;
    }
    return { received: true };
  }

  private findByStripe(paymentId: string | null, sessionId: string) {
    return this.prisma.payment.findFirst({
      where: { OR: [...(paymentId ? [{ id: paymentId }] : []), { stripeSessionId: sessionId }] },
      select: { id: true },
    });
  }

  // ---- Outcomes (shared by the webhook, admins and jobs) ----

  /**
   * Marks a payment CONFIRMED and applies what it unlocks: the first month activates the
   * enrollment (module 1 ACTIVE, the rest LOCKED), later months open their module once the
   * previous one is passed. Idempotent: a confirmed payment is left alone.
   */
  async applyConfirmed(
    paymentId: string,
    by: {
      adminId?: string;
      note?: string;
      stripe?: {
        paymentIntentId: string | null;
        chargeId: string | null;
        receiptUrl: string | null;
      };
    },
  ): Promise<void> {
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${paymentId} FOR UPDATE`;
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, status: true, enrollmentId: true, moduleId: true },
      });
      if (!payment) throw new NotFoundException('Pagesa nuk u gjet');
      if (payment.status === PaymentStatus.CONFIRMED) return null;
      if (payment.status === PaymentStatus.REFUNDED) {
        throw new ConflictException('Kjo pagesë është rimbursuar');
      }
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: now,
          confirmedById: by.adminId ?? null,
          note: by.note,
          holdExpiresAt: null,
          ...(by.stripe && {
            stripePaymentIntentId: by.stripe.paymentIntentId ?? undefined,
            stripeChargeId: by.stripe.chargeId ?? undefined,
            receiptUrl: by.stripe.receiptUrl ?? undefined,
          }),
        },
      });
      await tx.$queryRaw`SELECT "id" FROM "Enrollment" WHERE "id" = ${payment.enrollmentId} FOR UPDATE`;
      const enrollment = await tx.enrollment.findUniqueOrThrow({
        where: { id: payment.enrollmentId },
        select: { status: true, userId: true },
      });
      const firstMonth = enrollment.status !== EnrollmentStatus.APPROVED;
      if (firstMonth) await activateEnrollment(tx, payment.enrollmentId, now);
      await unlockIfReady(tx, enrollment.userId, payment.moduleId, now);
      return { firstMonth };
    });
    if (!result) return;
    if (result.firstMonth) await this.sendRegistrationConfirmed(paymentId);
    else await this.sendPaymentConfirmed(paymentId);
  }

  private async applyFailed(
    paymentId: string,
    reason: 'card' | 'rejected',
    note?: string,
  ): Promise<void> {
    const { count } = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED, failedAt: new Date(), note },
    });
    if (count === 0) return;
    if (reason === 'rejected') {
      // The admin said no: release the seat straight away rather than at the hold's end.
      const payment = await this.prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: { enrollmentId: true },
      });
      await this.prisma.enrollment.updateMany({
        where: { id: payment.enrollmentId, status: EnrollmentStatus.PENDING_PAYMENT },
        data: { status: EnrollmentStatus.CANCELLED, holdExpiresAt: null },
      });
    }
    await this.sendPaymentFailed(paymentId, reason);
  }

  private async applyRefunded(
    paymentId: string,
    adminId: string | null,
    note: string | null,
  ): Promise<void> {
    const { count } = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.PENDING] } },
      data: { status: PaymentStatus.REFUNDED, refundedAt: new Date(), note: note ?? undefined },
    });
    if (count === 0) return;
    this.logger.log(`Payment ${paymentId} refunded${adminId ? ` by ${adminId}` : ' (Stripe)'}`);
    await this.sendRefundIssued(paymentId);
  }

  /**
   * A pending payment whose hold ran out: it becomes EXPIRED and, if it was holding the
   * student's first-month seat and nothing else does, the enrollment expires and the seat
   * is free again. Later-month payments just expire (the student can start a new one).
   */
  async expirePayment(paymentId: string, now: Date): Promise<boolean> {
    const released = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.EXPIRED },
      });
      if (count === 0) return false;
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: { enrollmentId: true, enrollment: { select: { status: true } } },
      });
      if (payment.enrollment.status !== EnrollmentStatus.PENDING_PAYMENT) return false;
      const stillHeld = await tx.payment.count({
        where: {
          enrollmentId: payment.enrollmentId,
          status: PaymentStatus.PENDING,
          holdExpiresAt: { gt: now },
        },
      });
      if (stillHeld > 0) return false;
      await tx.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: EnrollmentStatus.EXPIRED, holdExpiresAt: null },
      });
      return true;
    });
    if (released) await this.sendHoldExpired(paymentId);
    return released;
  }

  // ---- Jobs ----

  /** Every minute: pending payments past their hold. Returns how many expired. */
  async expireHolds(now = new Date()): Promise<number> {
    const due = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING, holdExpiresAt: { lte: now } },
      select: { id: true },
    });
    let n = 0;
    for (const { id } of due) {
      try {
        await this.expirePayment(id, now);
        n++;
      } catch (error) {
        this.logger.error(`Could not expire payment ${id}`, (error as Error).stack);
      }
    }
    return n;
  }

  /** Hourly: bank transfers whose hold ends within 12 hours get one warning email. */
  async warnExpiringHolds(now = new Date()): Promise<number> {
    const soon = new Date(now.getTime() + HOLD_EXPIRING_WARNING_HOURS * 60 * 60_000);
    const due = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        provider: PaymentMethod.BANK_TRANSFER,
        holdExpiresAt: { gt: now, lte: soon },
        enrollment: { status: EnrollmentStatus.PENDING_PAYMENT },
      },
      select: paymentSelect,
    });
    let n = 0;
    for (const payment of due) {
      const rendered = templates.holdExpiring({
        firstName: payment.enrollment.user.firstName,
        courseTitle: payment.enrollment.course.title,
        reference: payment.reference,
        expiresAt: payment.holdExpiresAt ?? now,
        paymentUrl: `${this.webUrl}/payments/${payment.id}`,
      });
      const sent = await this.mail.sendLogged({
        to: payment.enrollment.user.email,
        ...rendered,
        type: EmailType.HOLD_EXPIRING,
        uniqueKey: `hold-expiring:${payment.id}`,
        userId: payment.enrollment.userId,
      });
      if (sent === 'sent') n++;
    }
    return n;
  }

  // ---- Admin ----

  async listForAdmin(query: ListPaymentsQueryDto): Promise<Paginated<AdminPaymentRecord>> {
    const where = this.adminWhere(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: paymentSelect,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      items: await Promise.all(rows.map((r) => this.toAdminRecord(r))),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async exportCsv(query: ListPaymentsQueryDto): Promise<string> {
    const rows = await this.prisma.payment.findMany({
      where: this.adminWhere(query),
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      select: paymentSelect,
    });
    const cell = (v: string | number | null | undefined) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      'Data',
      'Studenti',
      'Email',
      'Kursi',
      'Grupi',
      'Moduli',
      'Shuma',
      'Monedha',
      'Mënyra',
      'Statusi',
      'Referenca',
      'Konfirmuar më',
      'Konfirmuar nga',
      'Stripe payment intent',
      'Shënim',
    ];
    const lines = rows.map((r) =>
      [
        r.createdAt.toISOString(),
        `${r.enrollment.user.firstName} ${r.enrollment.user.lastName}`,
        r.enrollment.user.email,
        r.enrollment.course.title,
        r.enrollment.group?.name ?? '',
        `${r.module.order}: ${r.module.title}`,
        (r.amountCents / 100).toFixed(2),
        r.currency,
        r.provider,
        r.status,
        r.reference,
        r.confirmedAt?.toISOString() ?? '',
        r.confirmedBy ? `${r.confirmedBy.firstName} ${r.confirmedBy.lastName}` : '',
        r.stripePaymentIntentId ?? '',
        r.note ?? '',
      ]
        .map(cell)
        .join(','),
    );
    // A BOM so Excel opens the UTF-8 (ë, ç) correctly.
    return `\uFEFF${[header.join(','), ...lines].join('\r\n')}\r\n`;
  }

  private adminWhere(query: ListPaymentsQueryDto): Prisma.PaymentWhereInput {
    return {
      provider: query.provider,
      status: query.status,
      ...(query.groupId && { enrollment: { groupId: query.groupId } }),
    };
  }

  /** Admin: a bank transfer arrived. */
  async confirm(id: string, admin: AuthUser, note?: string): Promise<AdminPaymentRecord> {
    const payment = await this.adminPayment(id);
    if (payment.provider !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Pagesat me kartë konfirmohen vetëm nga Stripe');
    }
    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.EXPIRED) {
      throw new ConflictException('Vetëm pagesat në pritje mund të konfirmohen');
    }
    await this.applyConfirmed(id, { adminId: admin.id, note });
    return this.toAdminRecord(await this.adminPayment(id));
  }

  async reject(id: string, _admin: AuthUser, note?: string): Promise<AdminPaymentRecord> {
    const payment = await this.adminPayment(id);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Vetëm pagesat në pritje mund të refuzohen');
    }
    await this.applyFailed(id, 'rejected', note);
    return this.toAdminRecord(await this.adminPayment(id));
  }

  async refund(id: string, admin: AuthUser, note?: string): Promise<AdminPaymentRecord> {
    const payment = await this.adminPayment(id);
    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new ConflictException('Vetëm pagesat e konfirmuara mund të rimbursohen');
    }
    await this.providerFor(payment.provider).refund({
      id: payment.id,
      amountCents: payment.amountCents,
      stripePaymentIntentId: payment.stripePaymentIntentId,
    });
    await this.applyRefunded(id, admin.id, note ?? null);
    return this.toAdminRecord(await this.adminPayment(id));
  }

  /** Admin: money received outside the platform (cash, a transfer without a reference). */
  async manual(dto: ManualPaymentDto, admin: AuthUser): Promise<AdminPaymentRecord> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      select: {
        id: true,
        status: true,
        course: {
          select: {
            priceCents: true,
            currency: true,
            modules: { where: { id: dto.moduleId }, select: { id: true } },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Regjistrimi nuk u gjet');
    if (enrollment.course.modules.length === 0) throw new NotFoundException('Moduli nuk u gjet');
    if (
      enrollment.status === EnrollmentStatus.REJECTED ||
      enrollment.status === EnrollmentStatus.CANCELLED
    ) {
      throw new ConflictException('Ky regjistrim është i refuzuar ose i anuluar');
    }
    const payment = await this.prisma.$transaction(async (tx) => {
      const paid = await tx.payment.count({
        where: {
          enrollmentId: dto.enrollmentId,
          moduleId: dto.moduleId,
          status: PaymentStatus.CONFIRMED,
        },
      });
      if (paid > 0) throw new ConflictException('Ky muaj është paguar tashmë');
      await this.expirePending(tx, dto.enrollmentId, dto.moduleId, new Date());
      return tx.payment.create({
        data: {
          enrollmentId: dto.enrollmentId,
          moduleId: dto.moduleId,
          amountCents: enrollment.course.priceCents,
          currency: enrollment.course.currency,
          provider: PaymentMethod.BANK_TRANSFER,
          reference: makeReference('MAN'),
        },
        select: { id: true },
      });
    });
    await this.applyConfirmed(payment.id, { adminId: admin.id, note: dto.note ?? undefined });
    return this.toAdminRecord(await this.adminPayment(payment.id));
  }

  private async adminPayment(id: string): Promise<PaymentRow> {
    const row = await this.prisma.payment.findUnique({ where: { id }, select: paymentSelect });
    if (!row) throw new NotFoundException('Pagesa nuk u gjet');
    return row;
  }

  // ---- Shapes ----

  private async toRecord(row: PaymentRow): Promise<PaymentRecord> {
    const bank =
      row.provider === PaymentMethod.BANK_TRANSFER && row.status === PaymentStatus.PENDING
        ? await this.bankInstructions(row)
        : null;
    return {
      id: row.id,
      enrollmentId: row.enrollmentId,
      module: row.module,
      course: row.enrollment.course,
      group: row.enrollment.group,
      amountCents: row.amountCents,
      currency: row.currency,
      provider: row.provider,
      status: row.status,
      reference: row.reference,
      receiptUrl: row.receiptUrl,
      holdExpiresAt: row.holdExpiresAt,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      bank,
    };
  }

  private async toAdminRecord(row: PaymentRow): Promise<AdminPaymentRecord> {
    return {
      ...(await this.toRecord(row)),
      user: row.enrollment.user,
      note: row.note,
      confirmedBy: row.confirmedBy,
      refundedAt: row.refundedAt,
      failedAt: row.failedAt,
      stripePaymentIntentId: row.stripePaymentIntentId,
    };
  }

  private async bankInstructions(row: PaymentRow): Promise<BankInstructionsRecord> {
    const s = await this.settings.get();
    return {
      beneficiary: s.bankBeneficiary,
      iban: s.bankIban,
      bankName: s.bankName,
      swift: s.bankSwift,
      reference: row.reference,
      amountCents: row.amountCents,
      currency: row.currency,
      payBy: row.holdExpiresAt,
    };
  }

  // ---- Emails ----

  private async sendWaitlisted(
    enrollmentId: string,
    group: { id: string; name: string; course: { title: string } },
  ) {
    const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
      where: { id: enrollmentId },
      select: { userId: true, user: { select: { email: true, firstName: true } } },
    });
    const rendered = templates.waitlistJoined({
      firstName: enrollment.user.firstName,
      courseTitle: group.course.title,
      groupName: group.name,
    });
    await this.mail.sendLogged({
      to: enrollment.user.email,
      ...rendered,
      type: EmailType.WAITLIST_JOINED,
      uniqueKey: `waitlist:${enrollmentId}:${group.id}`,
      userId: enrollment.userId,
    });
  }

  private async sendPaymentPending(row: PaymentRow, record: PaymentRecord) {
    const rendered = templates.paymentPending({
      firstName: row.enrollment.user.firstName,
      courseTitle: row.enrollment.course.title,
      moduleTitle: `Moduli ${row.module.order}: ${row.module.title}`,
      amountCents: row.amountCents,
      currency: row.currency,
      reference: row.reference,
      bank: record.bank ?? { beneficiary: null, iban: null, bankName: null, swift: null },
      payBy: row.holdExpiresAt,
      paymentUrl: `${this.webUrl}/payments/${row.id}`,
    });
    await this.mail.sendLogged({
      to: row.enrollment.user.email,
      ...rendered,
      type: EmailType.PAYMENT_PENDING,
      uniqueKey: `payment-pending:${row.id}`,
      userId: row.enrollment.userId,
    });
  }

  /** The first month: the welcome email with the full timetable and an .ics attachment. */
  private async sendRegistrationConfirmed(paymentId: string) {
    const row = await this.adminPayment(paymentId);
    const group = row.enrollment.group
      ? await this.prisma.group.findUnique({
          where: { id: row.enrollment.group.id },
          select: {
            id: true,
            name: true,
            startDate: true,
            meetUrl: true,
            timezone: true,
            sessions: {
              where: { moduleId: row.module.id },
              orderBy: { startsAt: 'asc' },
              select: { id: true, title: true, startsAt: true, durationMin: true, meetUrl: true },
            },
          },
        })
      : null;
    const sessions = group?.sessions ?? [];
    const meetUrl = group?.meetUrl ?? sessions[0]?.meetUrl ?? null;
    const rendered = templates.registrationConfirmed({
      firstName: row.enrollment.user.firstName,
      courseTitle: row.enrollment.course.title,
      groupName: group?.name ?? '—',
      startDate: group?.startDate ?? row.createdAt,
      sessions,
      meetUrl,
      panelUrl: `${this.webUrl}/dashboard`,
      timeZone: group?.timezone,
    });
    const ics = buildIcs(
      `${row.enrollment.course.title} · ${group?.name ?? ''}`,
      sessions.map((s) => ({
        uid: `${s.id}@avenir.academy`,
        start: s.startsAt,
        durationMin: s.durationMin,
        summary: `${row.enrollment.course.title}: ${s.title}`,
        description: 'Leksion live në Google Meet (Avenir Academy)',
        url: s.meetUrl,
      })),
    );
    await this.mail.sendLogged({
      to: row.enrollment.user.email,
      ...rendered,
      attachments: [
        {
          filename: 'orari-avenir-academy.ics',
          content: ics,
          contentType: 'text/calendar; charset=utf-8',
        },
      ],
      type: EmailType.REGISTRATION_CONFIRMED,
      uniqueKey: `registration:${row.enrollmentId}`,
      userId: row.enrollment.userId,
      meta: { paymentId, sessions: sessions.length },
    });
  }

  private async sendPaymentConfirmed(paymentId: string) {
    const row = await this.adminPayment(paymentId);
    const rendered = templates.paymentConfirmed({
      firstName: row.enrollment.user.firstName,
      courseTitle: row.enrollment.course.title,
      moduleTitle: `Moduli ${row.module.order}: ${row.module.title}`,
      amountCents: row.amountCents,
      currency: row.currency,
      receiptUrl: row.receiptUrl,
      panelUrl: `${this.webUrl}/dashboard`,
    });
    await this.mail.sendLogged({
      to: row.enrollment.user.email,
      ...rendered,
      type: EmailType.PAYMENT_CONFIRMED,
      uniqueKey: `payment-confirmed:${row.id}`,
      userId: row.enrollment.userId,
    });
  }

  private async sendPaymentFailed(paymentId: string, reason: 'card' | 'rejected') {
    const row = await this.adminPayment(paymentId);
    const rendered = templates.paymentFailed({
      firstName: row.enrollment.user.firstName,
      courseTitle: row.enrollment.course.title,
      moduleTitle: `Moduli ${row.module.order}: ${row.module.title}`,
      reason,
      retryUrl: `${this.webUrl}/checkout/${row.enrollment.group?.id ?? ''}?module=${row.module.id}`,
    });
    await this.mail.sendLogged({
      to: row.enrollment.user.email,
      ...rendered,
      type: EmailType.PAYMENT_FAILED,
      uniqueKey: `payment-failed:${row.id}`,
      userId: row.enrollment.userId,
    });
  }

  private async sendHoldExpired(paymentId: string) {
    const row = await this.adminPayment(paymentId);
    const rendered = templates.holdExpired({
      firstName: row.enrollment.user.firstName,
      courseTitle: row.enrollment.course.title,
      courseUrl: `${this.webUrl}/courses/${row.enrollment.course.slug}`,
    });
    await this.mail.sendLogged({
      to: row.enrollment.user.email,
      ...rendered,
      type: EmailType.HOLD_EXPIRED,
      uniqueKey: `hold-expired:${row.id}`,
      userId: row.enrollment.userId,
    });
  }

  private async sendRefundIssued(paymentId: string) {
    const row = await this.adminPayment(paymentId);
    const rendered = templates.refundIssued({
      firstName: row.enrollment.user.firstName,
      courseTitle: row.enrollment.course.title,
      moduleTitle: `Moduli ${row.module.order}: ${row.module.title}`,
      amountCents: row.amountCents,
      currency: row.currency,
    });
    await this.mail.sendLogged({
      to: row.enrollment.user.email,
      ...rendered,
      type: EmailType.REFUND_ISSUED,
      uniqueKey: `refund:${row.id}`,
      userId: row.enrollment.userId,
    });
  }

  /** Admin moved a waitlisted student into a group: a seat is held and they are told to pay. */
  async sendSeatOffered(enrollmentId: string, expiresAt: Date): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
      where: { id: enrollmentId },
      select: {
        userId: true,
        user: { select: { email: true, firstName: true } },
        course: { select: { title: true } },
        group: { select: { id: true, name: true, startDate: true } },
      },
    });
    if (!enrollment.group) return;
    const rendered = templates.seatOffered({
      firstName: enrollment.user.firstName,
      courseTitle: enrollment.course.title,
      groupName: enrollment.group.name,
      startDate: enrollment.group.startDate,
      expiresAt,
      checkoutUrl: `${this.webUrl}/checkout/${enrollment.group.id}`,
    });
    await this.mail.sendLogged({
      to: enrollment.user.email,
      ...rendered,
      type: EmailType.SEAT_OFFERED,
      uniqueKey: `seat-offered:${enrollmentId}:${enrollment.group.id}:${expiresAt.getTime()}`,
      userId: enrollment.userId,
    });
  }

  /** Hours a seat offered from the waitlist is held (shared with EnrollmentsService). */
  readonly waitlistOfferMs = WAITLIST_OFFER_HOURS * 60 * 60_000;

  /** Guards admin-only reads used by the controller. */
  assertAdmin(user: AuthUser): void {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Nuk ke leje për këtë veprim');
  }
}

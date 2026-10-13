import { HOLD_STRIPE_MIN } from '@ai-academy/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { PaymentMethod } from '../../generated/prisma/client.js';
import type {
  CheckoutContext,
  CheckoutStart,
  ParsedWebhook,
  PaymentProvider,
  RefundTarget,
} from './payment-provider.js';

/** Injection token for the Stripe client, so tests can replace it with a fake. */
export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

/** The slice of the Stripe SDK we use (a fake implements the same shape in tests). */
export interface StripeClient {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session>;
      expire(id: string): Promise<Stripe.Checkout.Session>;
    };
  };
  paymentIntents: {
    retrieve(
      id: string,
      params?: Stripe.PaymentIntentRetrieveParams,
    ): Promise<Stripe.PaymentIntent>;
  };
  refunds: { create(params: Stripe.RefundCreateParams): Promise<Stripe.Refund> };
  webhooks: {
    constructEvent(payload: Buffer | string, header: string, secret: string): Stripe.Event;
  };
}

export function createStripeClient(secretKey: string): StripeClient {
  return new Stripe(secretKey, { appInfo: { name: 'Avenir Academy' } });
}

/**
 * A stand-in for tests and local runs without keys (STRIPE_FAKE=true, never in production):
 * checkout "sessions" send the browser straight to the success page, webhooks are verified
 * with the real signature code, refunds and receipts are stubs.
 */
export function createFakeStripeClient(webUrl: string): StripeClient {
  const real = new Stripe('sk_test_fake');
  let n = 0;
  const session = (id: string, params: Stripe.Checkout.SessionCreateParams) =>
    ({
      id,
      object: 'checkout.session',
      url: `${webUrl}/checkout/success?payment=${params.client_reference_id ?? ''}&fake=1`,
      client_reference_id: params.client_reference_id ?? null,
      payment_status: 'unpaid',
      payment_intent: `pi_fake_${id}`,
      metadata: params.metadata ?? {},
    }) as unknown as Stripe.Checkout.Session;
  return {
    checkout: {
      sessions: {
        create: (params) => Promise.resolve(session(`cs_fake_${++n}_${Date.now()}`, params)),
        expire: (id) => Promise.resolve(session(id, {})),
      },
    },
    paymentIntents: {
      retrieve: (id) =>
        Promise.resolve({
          id,
          object: 'payment_intent',
          latest_charge: { id: `ch_${id}`, receipt_url: `https://receipt.stripe.test/${id}` },
        } as unknown as Stripe.PaymentIntent),
    },
    refunds: {
      create: (params) =>
        Promise.resolve({
          id: `re_fake_${Date.now()}`,
          payment_intent: params.payment_intent,
        } as unknown as Stripe.Refund),
    },
    webhooks: real.webhooks,
  };
}

/** Stripe's hosted Checkout page; sq isn't among its locales, so the page auto-detects. */
const CHECKOUT_LOCALE: Stripe.Checkout.SessionCreateParams.Locale = 'auto';

/**
 * Card payments through Stripe Checkout: one hosted session per month, built from the
 * course's price, expiring with the seat hold. Only the signed webhook confirms a payment;
 * the success redirect is never trusted.
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly method = PaymentMethod.STRIPE;
  readonly holdMs = HOLD_STRIPE_MIN * 60_000;
  private readonly logger = new Logger(StripeProvider.name);
  private readonly webhookSecret: string | undefined;
  private readonly enabled: boolean;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    @Optional() @Inject(STRIPE_CLIENT) private readonly stripe: StripeClient | null,
  ) {
    this.enabled = config.get('STRIPE_ENABLED', { infer: true });
    this.webhookSecret = config.get('STRIPE_WEBHOOK_SECRET', { infer: true }) || undefined;
  }

  isConfigured(): boolean {
    return this.enabled && this.stripe !== null;
  }

  private client(): StripeClient {
    if (!this.isConfigured() || !this.stripe) {
      throw new ServiceUnavailableException(
        'Pagesa me kartë nuk është e disponueshme për momentin. Zgjidh transfertën bankare.',
      );
    }
    return this.stripe;
  }

  async createCheckout(ctx: CheckoutContext): Promise<CheckoutStart> {
    const session = await this.client().checkout.sessions.create({
      mode: 'payment',
      locale: CHECKOUT_LOCALE,
      customer_email: ctx.customerEmail,
      client_reference_id: ctx.paymentId,
      metadata: ctx.metadata,
      payment_intent_data: { metadata: ctx.metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: ctx.currency.toLowerCase(),
            unit_amount: ctx.amountCents,
            product_data: { name: ctx.description, description: ctx.courseTitle },
          },
        },
      ],
      // Stripe needs at least 30 minutes; the hold ends at the same instant.
      expires_at: Math.floor(ctx.expiresAt.getTime() / 1000),
      success_url: ctx.successUrl,
      cancel_url: ctx.cancelUrl,
    });
    if (!session.url) throw new ServiceUnavailableException('Stripe nuk ktheu adresën e pagesës');
    return { kind: 'redirect', url: session.url, externalId: session.id };
  }

  /** Best effort: an abandoned hosted session is closed when the student starts over. */
  async expireSession(sessionId: string): Promise<void> {
    try {
      await this.client().checkout.sessions.expire(sessionId);
    } catch (error) {
      this.logger.warn(`Could not expire Stripe session ${sessionId}: ${(error as Error).message}`);
    }
  }

  handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<ParsedWebhook> {
    if (!this.webhookSecret) {
      return Promise.reject(new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET mungon'));
    }
    if (!signature) return Promise.reject(new BadRequestException('Mungon nënshkrimi i Stripe'));
    let event: Stripe.Event;
    try {
      event = this.client().webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      return Promise.reject(
        new BadRequestException(
          `Nënshkrimi i Stripe nuk është i vlefshëm: ${(error as Error).message}`,
        ),
      );
    }
    return Promise.resolve({ id: event.id, type: event.type, event: this.normalise(event) });
  }

  private normalise(event: Stripe.Event): ParsedWebhook['event'] {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        // A completed session with an asynchronous method is not paid yet; its own event follows.
        if (session.payment_status !== 'paid') return { kind: 'ignored', type: event.type };
        return {
          kind: 'paid',
          externalId: session.id,
          paymentId: session.client_reference_id ?? session.metadata?.paymentId ?? null,
          paymentIntentId: idOf(session.payment_intent),
          chargeId: null,
          receiptUrl: null,
        };
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        return {
          kind: 'failed',
          externalId: session.id,
          paymentId: session.client_reference_id ?? session.metadata?.paymentId ?? null,
        };
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        return {
          kind: 'expired',
          externalId: session.id,
          paymentId: session.client_reference_id ?? session.metadata?.paymentId ?? null,
        };
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = idOf(charge.payment_intent);
        return paymentIntentId
          ? { kind: 'refunded', paymentIntentId }
          : { kind: 'ignored', type: event.type };
      }
      default:
        return { kind: 'ignored', type: event.type };
    }
  }

  async refund(payment: RefundTarget): Promise<void> {
    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Kjo pagesë nuk ka një payment intent të Stripe');
    }
    await this.client().refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      metadata: { paymentId: payment.id },
    });
  }

  async receiptUrl(paymentIntentId: string): Promise<string | null> {
    try {
      const intent = await this.client().paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge'],
      });
      const charge = intent.latest_charge;
      return charge && typeof charge !== 'string' ? (charge.receipt_url ?? null) : null;
    } catch (error) {
      this.logger.warn(`No receipt for ${paymentIntentId}: ${(error as Error).message}`);
      return null;
    }
  }

  /** The charge id of a paid intent, for the admin's records. */
  async chargeId(paymentIntentId: string): Promise<string | null> {
    try {
      const intent = await this.client().paymentIntents.retrieve(paymentIntentId);
      return idOf(intent.latest_charge);
    } catch {
      return null;
    }
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

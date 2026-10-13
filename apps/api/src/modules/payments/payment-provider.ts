import type { PaymentMethod } from '../../generated/prisma/client.js';

/** What a provider needs to start a payment. */
export interface CheckoutContext {
  paymentId: string;
  reference: string;
  amountCents: number;
  currency: string;
  /** Line item shown to the student, e.g. "Development & Vibe Coding përmes AI · Moduli 1". */
  description: string;
  courseTitle: string;
  customerEmail: string;
  metadata: Record<string, string>;
  /** When the hold (and the hosted session) expires. */
  expiresAt: Date;
  successUrl: string;
  cancelUrl: string;
}

/** Either send the student somewhere (Stripe Checkout) or show them instructions (bank). */
export type CheckoutStart =
  { kind: 'redirect'; url: string; externalId: string } | { kind: 'instructions' };

/** A provider's view of something that happened to a payment, normalised. */
export type ProviderEvent =
  | {
      kind: 'paid';
      externalId: string;
      paymentId: string | null;
      paymentIntentId: string | null;
      chargeId: string | null;
      receiptUrl: string | null;
    }
  | { kind: 'failed'; externalId: string; paymentId: string | null }
  | { kind: 'expired'; externalId: string; paymentId: string | null }
  | { kind: 'refunded'; paymentIntentId: string }
  | { kind: 'ignored'; type: string };

export interface ParsedWebhook {
  /** The provider's event id (deduplicated in StripeEvent). */
  id: string;
  type: string;
  event: ProviderEvent;
}

export interface RefundTarget {
  id: string;
  amountCents: number;
  stripePaymentIntentId: string | null;
}

/**
 * The payment gateway abstraction: Stripe Checkout (card) and bank transfer implement it.
 * The PaymentsService owns the Payment rows and the enrollment side effects; providers only
 * talk to the outside world.
 */
export interface PaymentProvider {
  readonly method: PaymentMethod;
  /** How long a first-month seat is held while this provider's payment is pending. */
  readonly holdMs: number;
  /** Whether the provider can be used right now (keys configured, …). */
  isConfigured(): boolean;
  createCheckout(ctx: CheckoutContext): Promise<CheckoutStart>;
  /** Verifies and normalises an incoming webhook. Bank transfer has none. */
  handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<ParsedWebhook>;
  /** Returns money. For bank transfers this only records the admin's manual refund. */
  refund(payment: RefundTarget): Promise<void>;
  /** The hosted-receipt URL for a confirmed payment, when the provider has one. */
  receiptUrl(paymentIntentId: string): Promise<string | null>;
}

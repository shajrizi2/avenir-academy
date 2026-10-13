import { HOLD_BANK_HOURS } from '@ai-academy/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod } from '../../generated/prisma/client.js';
import type {
  CheckoutContext,
  CheckoutStart,
  ParsedWebhook,
  PaymentProvider,
  RefundTarget,
} from './payment-provider.js';

/**
 * Bank transfer: the student gets the IBAN and a unique reference, the seat is held for 48
 * hours, and an admin confirms the payment by hand in /admin/payments. Nothing external.
 */
@Injectable()
export class BankTransferProvider implements PaymentProvider {
  readonly method = PaymentMethod.BANK_TRANSFER;
  readonly holdMs = HOLD_BANK_HOURS * 60 * 60_000;

  isConfigured(): boolean {
    return true;
  }

  createCheckout(_ctx: CheckoutContext): Promise<CheckoutStart> {
    return Promise.resolve({ kind: 'instructions' });
  }

  handleWebhook(): Promise<ParsedWebhook> {
    return Promise.reject(new BadRequestException('Transfertat bankare nuk kanë webhook'));
  }

  /** The admin returns the money by transfer; the platform only records it. */
  refund(_payment: RefundTarget): Promise<void> {
    return Promise.resolve();
  }

  receiptUrl(): Promise<string | null> {
    return Promise.resolve(null);
  }
}

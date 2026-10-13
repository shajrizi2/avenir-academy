import type { Paginated } from '@ai-academy/shared';
import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../../common/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaymentMethod, Role } from '../../generated/prisma/enums.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';
import { ManualPaymentDto } from './dto/manual-payment.dto.js';
import { PayModuleDto } from './dto/pay-module.dto.js';
import { PaymentNoteDto } from './dto/payment-note.dto.js';
import {
  type AdminPaymentRecord,
  type CheckoutResultRecord,
  type PaymentRecord,
  PaymentsService,
} from './payments.service.js';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Which methods the checkout page may offer. */
  @Public()
  @Get('payments/methods')
  methods(): Promise<PaymentMethod[]> {
    return this.payments.enabledMethods();
  }

  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto): Promise<CheckoutResultRecord> {
    return this.payments.checkout(user, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Post('enrollments/:id/payments')
  @HttpCode(HttpStatus.OK)
  payModule(
    @CurrentUser() user: AuthUser,
    @Param('id') enrollmentId: string,
    @Body() dto: PayModuleDto,
  ): Promise<CheckoutResultRecord> {
    return this.payments.payModule(user, enrollmentId, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Get('me/payments')
  mine(@CurrentUser() user: AuthUser): Promise<PaymentRecord[]> {
    return this.payments.listForUser(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Get('me/payments/:id')
  one(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<PaymentRecord> {
    return this.payments.findForUser(user, id);
  }

  /**
   * Stripe calls this with the raw JSON and a signature; setupApp keeps the body raw for
   * this path only. Nothing else may confirm a card payment.
   */
  @ApiExcludeEndpoint()
  @Public()
  @Post('payments/stripe/webhook')
  @HttpCode(HttpStatus.OK)
  stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    return this.payments.handleStripeWebhook(raw, signature);
  }

  // ---- Admin ----

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('payments')
  list(@Query() query: ListPaymentsQueryDto): Promise<Paginated<AdminPaymentRecord>> {
    return this.payments.listForAdmin(query);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('payments/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="pagesat.csv"')
  exportCsv(@Query() query: ListPaymentsQueryDto): Promise<string> {
    return this.payments.exportCsv(query);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('payments/manual')
  manual(
    @CurrentUser() admin: AuthUser,
    @Body() dto: ManualPaymentDto,
  ): Promise<AdminPaymentRecord> {
    return this.payments.manual(dto, admin);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('payments/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: PaymentNoteDto,
  ): Promise<AdminPaymentRecord> {
    return this.payments.confirm(id, admin, dto.note ?? undefined);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('payments/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: PaymentNoteDto,
  ): Promise<AdminPaymentRecord> {
    return this.payments.reject(id, admin, dto.note ?? undefined);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('payments/:id/refund')
  @HttpCode(HttpStatus.OK)
  refund(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: PaymentNoteDto,
  ): Promise<AdminPaymentRecord> {
    return this.payments.refund(id, admin, dto.note ?? undefined);
  }
}

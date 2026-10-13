import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { GroupsModule } from '../groups/groups.module.js';
import { SiteSettingsModule } from '../site-settings/site-settings.module.js';
import { BankTransferProvider } from './bank-transfer.provider.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { createStripeClient, STRIPE_CLIENT, StripeProvider } from './stripe.provider.js';

@Module({
  imports: [GroupsModule, SiteSettingsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeProvider,
    BankTransferProvider,
    {
      // Null without a key: card checkout then answers 503 (and production refuses to start
      // while STRIPE_ENABLED=true, see env.validation.ts). Tests override this token.
      provide: STRIPE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const key = config.get('STRIPE_SECRET_KEY', { infer: true });
        return key && config.get('STRIPE_ENABLED', { infer: true })
          ? createStripeClient(key)
          : null;
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}

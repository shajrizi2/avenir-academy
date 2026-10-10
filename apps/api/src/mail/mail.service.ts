import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { type EnvironmentVariables, NodeEnv } from '../config/env.validation.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends email through SMTP (MAIL_TRANSPORT=smtp, any provider) or writes it to the log
 * (MAIL_TRANSPORT=console, the development default). `send` never throws: a delivery
 * failure is logged, so callers can't leak whether an account exists through errors.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    if (config.get('MAIL_TRANSPORT', { infer: true }) === 'smtp') {
      const user = config.get('SMTP_USER', { infer: true });
      this.transporter = createTransport({
        host: config.get('SMTP_HOST', { infer: true }),
        port: config.get('SMTP_PORT', { infer: true }),
        secure: config.get('SMTP_SECURE', { infer: true }),
        auth: user ? { user, pass: config.get('SMTP_PASS', { infer: true }) } : undefined,
      });
    } else {
      this.transporter = null;
      if (config.get('NODE_ENV', { infer: true }) === NodeEnv.Production) {
        this.logger.warn('MAIL_TRANSPORT=console: emails are only written to the log');
      }
    }
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        [
          '📧 Email (console transport)',
          `To: ${message.to}`,
          `Subject: ${message.subject}`,
          '',
          message.text,
        ].join('\n'),
      );
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...message });
    } catch (error) {
      this.logger.error(`Could not send "${message.subject}"`, (error as Error).stack);
    }
  }
}

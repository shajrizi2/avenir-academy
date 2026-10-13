import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { type EnvironmentVariables, NodeEnv } from '../config/env.validation.js';
import { type EmailType, EmailStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface MailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}

/** A logged, idempotent send: the same `uniqueKey` is never sent twice. */
export interface LoggedMail extends MailMessage {
  type: EmailType;
  uniqueKey: string;
  userId?: string | null;
  meta?: Prisma.InputJsonValue;
}

/**
 * Sends email through SMTP (MAIL_TRANSPORT=smtp, any provider) or writes it to the log
 * (MAIL_TRANSPORT=console, the development default). `send` never throws: a delivery
 * failure is logged, so callers can't leak whether an account exists through errors.
 *
 * `sendLogged` records every email in EmailLog first, keyed by `uniqueKey`, so a cron job
 * that runs twice or a restart never emails the same thing twice.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly prisma: PrismaService,
  ) {
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

  /** Sends (or logs) one email. Resolves to true when it was handed to the transport. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(
        [
          '📧 Email (console transport)',
          `To: ${message.to}`,
          `Subject: ${message.subject}`,
          ...(message.attachments?.length
            ? [`Attachments: ${message.attachments.map((a) => a.filename).join(', ')}`]
            : []),
          '',
          message.text,
        ].join('\n'),
      );
      return true;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...message });
      return true;
    } catch (error) {
      this.logger.error(`Could not send "${message.subject}"`, (error as Error).stack);
      return false;
    }
  }

  /**
   * Idempotent send: inserts the EmailLog row first (the unique key is the lock), sends, then
   * records the outcome. Returns 'sent', 'failed' or 'duplicate' (already sent or in flight).
   */
  async sendLogged(mail: LoggedMail): Promise<'sent' | 'failed' | 'duplicate'> {
    const { type, uniqueKey, userId, meta, ...message } = mail;
    let logId: string;
    try {
      const log = await this.prisma.emailLog.create({
        data: {
          type,
          uniqueKey,
          userId: userId ?? null,
          to: message.to,
          subject: message.subject,
          meta,
        },
        select: { id: true },
      });
      logId = log.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return 'duplicate';
      }
      throw error;
    }

    const ok = await this.send(message);
    await this.prisma.emailLog.update({
      where: { id: logId },
      data: ok
        ? { status: EmailStatus.SENT, sentAt: new Date() }
        : { status: EmailStatus.FAILED, error: 'Delivery failed (see the API log)' },
    });
    return ok ? 'sent' : 'failed';
  }
}

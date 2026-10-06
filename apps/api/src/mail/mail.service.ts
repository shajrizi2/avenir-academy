import { Injectable, Logger } from '@nestjs/common';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Console mail transport. Every email is written to the API log instead of being sent.
 * A real provider (SMTP or a paid API) is a Sprint 4 decision; swap the body of `send` then.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  send(message: MailMessage): Promise<void> {
    this.logger.log(
      [
        '📧 Email (console transport)',
        `To: ${message.to}`,
        `Subject: ${message.subject}`,
        '',
        message.text,
      ].join('\n'),
    );
    return Promise.resolve();
  }
}

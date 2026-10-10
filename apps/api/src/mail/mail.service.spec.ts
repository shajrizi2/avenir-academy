import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { MailService } from './mail.service.js';

/** A fake SMTP transport: records messages, or fails when `failing` is set. */
const transport = { sent: [] as unknown[], failing: false };
vi.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: (mail: unknown) => {
      if (transport.failing) return Promise.reject(new Error('connection refused'));
      transport.sent.push(mail);
      return Promise.resolve({});
    },
  }),
}));

function configWith(values: Partial<EnvironmentVariables>) {
  return {
    get: (key: keyof EnvironmentVariables) => values[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

const message = { to: 'sara@example.com', subject: 'Hello', text: 'Body' };

describe('MailService', () => {
  beforeEach(() => {
    transport.sent = [];
    transport.failing = false;
  });

  it('sends through SMTP with the configured sender', async () => {
    const mail = new MailService(
      configWith({ MAIL_TRANSPORT: 'smtp', MAIL_FROM: 'AI Academy <a@b.c>', SMTP_HOST: 'smtp' }),
    );
    await mail.send(message);
    expect(transport.sent).toEqual([{ from: 'AI Academy <a@b.c>', ...message }]);
  });

  it('logs instead of throwing when delivery fails', async () => {
    transport.failing = true;
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const mail = new MailService(configWith({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp' }));
    await expect(mail.send(message)).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledOnce();
  });

  it('only logs with the console transport', async () => {
    const mail = new MailService(configWith({ MAIL_TRANSPORT: 'console' }));
    await mail.send(message);
    expect(transport.sent).toEqual([]);
  });
});

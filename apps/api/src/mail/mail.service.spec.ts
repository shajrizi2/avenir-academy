import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
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

/** An in-memory EmailLog with the unique key enforced like Postgres would. */
function fakePrisma() {
  const rows = new Map<string, { id: string; status: string }>();
  let n = 0;
  return {
    rows,
    emailLog: {
      create: vi.fn(({ data }: { data: { uniqueKey: string } }) => {
        if (rows.has(data.uniqueKey)) {
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: 'test',
            }),
          );
        }
        const row = { id: `log_${++n}`, status: 'PENDING' };
        rows.set(data.uniqueKey, row);
        return Promise.resolve({ id: row.id });
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: { status: string } }) => {
        for (const row of rows.values()) if (row.id === where.id) row.status = data.status;
        return Promise.resolve({});
      }),
    },
  };
}

const message = { to: 'sara@example.com', subject: 'Përshëndetje', text: 'Trupi' };

describe('MailService', () => {
  beforeEach(() => {
    transport.sent = [];
    transport.failing = false;
  });

  it('sends through SMTP with the configured sender', async () => {
    const mail = new MailService(
      configWith({ MAIL_TRANSPORT: 'smtp', MAIL_FROM: 'Avenir <a@b.c>', SMTP_HOST: 'smtp' }),
      fakePrisma() as unknown as PrismaService,
    );
    await expect(mail.send(message)).resolves.toBe(true);
    expect(transport.sent).toEqual([{ from: 'Avenir <a@b.c>', ...message }]);
  });

  it('logs instead of throwing when delivery fails', async () => {
    transport.failing = true;
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const mail = new MailService(
      configWith({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp' }),
      fakePrisma() as unknown as PrismaService,
    );
    await expect(mail.send(message)).resolves.toBe(false);
    expect(logged).toHaveBeenCalledOnce();
  });

  it('only logs with the console transport', async () => {
    const mail = new MailService(
      configWith({ MAIL_TRANSPORT: 'console' }),
      fakePrisma() as unknown as PrismaService,
    );
    await mail.send(message);
    expect(transport.sent).toEqual([]);
  });

  it('sends a logged email once per unique key', async () => {
    const prisma = fakePrisma();
    const mail = new MailService(
      configWith({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp' }),
      prisma as unknown as PrismaService,
    );
    const logged = { ...message, type: 'OFFLINE_LEARNING' as const, uniqueKey: 'offline:u1:d1' };
    await expect(mail.sendLogged(logged)).resolves.toBe('sent');
    await expect(mail.sendLogged(logged)).resolves.toBe('duplicate');
    expect(transport.sent).toHaveLength(1);
    expect(prisma.rows.get('offline:u1:d1')?.status).toBe('SENT');
  });

  it('records a failed delivery in the log', async () => {
    transport.failing = true;
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const prisma = fakePrisma();
    const mail = new MailService(
      configWith({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp' }),
      prisma as unknown as PrismaService,
    );
    await expect(
      mail.sendLogged({ ...message, type: 'PAYMENT_CONFIRMED', uniqueKey: 'pay:1' }),
    ).resolves.toBe('failed');
    expect(prisma.rows.get('pay:1')?.status).toBe('FAILED');
  });
});

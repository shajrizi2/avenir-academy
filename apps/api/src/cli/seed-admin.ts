/**
 * Production seed: creates ONLY the first admin account, from environment variables. No demo
 * data. Safe to run again: an existing account keeps its password and is (re)made an admin.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... ADMIN_FIRST_NAME=... ADMIN_LAST_NAME=... \
 *     node dist/src/cli/seed-admin.js
 *
 * On the server: deploy/scripts/compose.sh run --rm -e ADMIN_EMAIL=... api node dist/src/cli/seed-admin.js
 * (docs/DEPLOY.md, step 8). Development uses `pnpm db:seed` instead.
 */
import 'dotenv/config';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@ai-academy/shared';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '../generated/prisma/client.js';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  const email = required('ADMIN_EMAIL').toLowerCase();
  const password = required('ADMIN_PASSWORD');
  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'Avenir';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > EMAIL_MAX_LENGTH) {
    throw new Error('ADMIN_EMAIL is not a valid email address');
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: required('DATABASE_URL') }),
  });
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (existing) {
      if (existing.role !== Role.ADMIN) {
        await prisma.user.update({ where: { email }, data: { role: Role.ADMIN } });
        console.log(`${email} already existed; it is now an admin (password unchanged).`);
      } else {
        console.log(`${email} is already an admin; nothing to do.`);
      }
      return;
    }
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash(password, rounds),
      },
      select: { id: true },
    });
    console.log(`Created admin ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
